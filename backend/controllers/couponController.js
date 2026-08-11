import { StatusCodes } from 'http-status-codes';

import Coupon from '../models/Coupon.js';
import { BadRequestError, NotFoundError } from '../errors/customErrors.js';

/**
 * Resolve a code against a basket subtotal.
 *
 * Shared by the checkout's preview (`POST /coupons/validate`) and by
 * `newOrder`, so a coupon that expires or hits its usage cap between quoting
 * and placing is rejected at the point it matters. Throws `BadRequestError`
 * with the reason; returns `{ coupon, discount }` on success.
 */
export const applyCoupon = async (code, subtotal) => {
  const coupon = await Coupon.findOne({ code: String(code || '').trim().toUpperCase() });

  if (!coupon || !coupon.isActive) {
    throw new BadRequestError('That promo code is not valid');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError('That promo code has expired');
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new BadRequestError('That promo code has been fully redeemed');
  }
  if (coupon.minSpend > 0 && subtotal < coupon.minSpend) {
    throw new BadRequestError(
      `Spend at least KES ${coupon.minSpend.toLocaleString()} to use this code`
    );
  }

  const discount = coupon.discountFor(subtotal);
  if (discount <= 0) {
    throw new BadRequestError('That promo code takes nothing off this order');
  }

  return { coupon, discount };
};

// POST /api/v1/coupons/validate  — quote a code without redeeming it.
export const validateCoupon = async (req, res) => {
  const { code, subtotal } = req.body;
  const { coupon, discount } = await applyCoupon(code, Number(subtotal) || 0);

  res.status(StatusCodes.OK).json({
    success: true,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
    },
    discount,
  });
};

/**
 * GET /api/v1/coupons/public — the codes the storefront may advertise.
 *
 * Filtered to what a shopper could actually redeem right now, so the list
 * never offers a code that then fails: public, active, unexpired, and not at
 * its usage cap. `minSpend` is returned rather than filtered on — the cart
 * shows those greyed with what's left to spend, which is useful information
 * instead of a missing row.
 */
export const getPublicCoupons = async (req, res) => {
  const now = new Date();

  const coupons = await Coupon.find({
    isPublic: true,
    isActive: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    ],
  })
    .select('code description type value maxDiscount minSpend expiresAt')
    .sort('minSpend')
    .lean();

  res.status(StatusCodes.OK).json({ success: true, coupons });
};

// GET /api/v1/coupons  (admin)
export const getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort('-createdAt').lean();
  res.status(StatusCodes.OK).json({ success: true, coupons });
};

// POST /api/v1/coupons  (admin)
export const createCoupon = async (req, res) => {
  const { code, description, type, value, maxDiscount, minSpend, expiresAt, usageLimit, isPublic } =
    req.body;

  // Whitelisted rather than spread: `usedCount` and `createdBy` are ours to
  // set, and a create call shouldn't be able to seed a coupon as half-spent.
  const coupon = await Coupon.create({
    code,
    description,
    type,
    value,
    maxDiscount,
    minSpend,
    expiresAt: expiresAt || null,
    usageLimit,
    isPublic,
    createdBy: req.user.id,
  });

  res.status(StatusCodes.CREATED).json({ success: true, coupon });
};

// PATCH /api/v1/coupons/:id  (admin)
export const updateCoupon = async (req, res) => {
  const { code, description, type, value, maxDiscount, minSpend, expiresAt, usageLimit, isActive, isPublic } =
    req.body;

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { code, description, type, value, maxDiscount, minSpend, expiresAt, usageLimit, isActive, isPublic },
    { new: true, runValidators: true, omitUndefined: true }
  );
  if (!coupon) throw new NotFoundError('coupon not found');

  res.status(StatusCodes.OK).json({ success: true, coupon });
};

// DELETE /api/v1/coupons/:id  (admin)
export const deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new NotFoundError('coupon not found');

  res.status(StatusCodes.OK).json({ success: true, message: 'Coupon deleted' });
};
