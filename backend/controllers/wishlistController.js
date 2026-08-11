import { StatusCodes } from 'http-status-codes';

import User from '../models/User.js';
import Product from '../models/Product.js';
import { BadRequestError, NotFoundError } from '../errors/customErrors.js';

/**
 * The signed-in user's saved products (`User.wishlist`).
 *
 * Membership is the whole model: a product is saved or it isn't. Adding is
 * therefore idempotent — `$addToSet`, so the request can be replayed, and a
 * heart tapped twice in a row can't store the product twice.
 *
 * The list is stored as refs and populated on read with the same projection
 * the product grid needs, so the wishlist page can render `ProductCard`
 * without a second round of requests.
 */

// The fields ProductCard reads. `stock` comes along because a saved product
// going out of stock is exactly what a wishlist exists to tell you.
const CARD_FIELDS = 'name slug thumbnail price specialPrice brand stock category';

const listFor = async (userId) => {
  const user = await User.findById(userId)
    .select('wishlist')
    .populate({ path: 'wishlist', select: CARD_FIELDS });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // A product deleted from the catalogue leaves a dangling ref that populate
  // resolves to null — drop those rather than rendering a blank card.
  return (user.wishlist || []).filter(Boolean);
};

// GET /api/v1/me/wishlist
export const getWishlist = async (req, res) => {
  const wishlist = await listFor(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, wishlist });
};

// POST /api/v1/me/wishlist  { productId }
export const addToWishlist = async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    throw new BadRequestError('A productId is required');
  }

  // Checked before saving: a wishlist of ids that point at nothing is a page
  // of blank cards the user can't explain or clear.
  const exists = await Product.exists({ _id: productId });
  if (!exists) {
    throw new NotFoundError('That product no longer exists');
  }

  await User.updateOne({ _id: req.user.id }, { $addToSet: { wishlist: productId } });

  const wishlist = await listFor(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, message: 'Saved to your wishlist', wishlist });
};

// DELETE /api/v1/me/wishlist/:productId
export const removeFromWishlist = async (req, res) => {
  await User.updateOne(
    { _id: req.user.id },
    { $pull: { wishlist: req.params.productId } }
  );

  const wishlist = await listFor(req.user.id);
  res.status(StatusCodes.OK).json({ success: true, message: 'Removed', wishlist });
};
