import mongoose from 'mongoose';

/**
 * A promo code.
 *
 * Codes are stored uppercase and matched uppercase — a shopper typing
 * `welcome10` has to hit the same document as one typing `WELCOME10`, and a
 * case-sensitive unique index would happily accept both as separate coupons.
 *
 * The discount is never taken from the request. `applyCoupon` in
 * `couponController` is the only thing that computes an amount, and both the
 * checkout's preview and `newOrder`'s saved figure call it, so what's quoted
 * and what's charged come from one place.
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'A coupon needs a code'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Code must be at least 3 characters'],
      maxlength: [24, 'Code must be 24 characters or fewer'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['percent', 'fixed'],
      required: true,
      default: 'percent',
    },
    // Percent: 1–100. Fixed: an amount in KES.
    value: {
      type: Number,
      required: [true, 'A coupon needs a value'],
      min: [1, 'Value must be greater than zero'],
    },
    // Ignored when 0. A percent coupon without one can discount an order to
    // almost nothing, which is usually not what a "20% off" campaign means.
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minSpend: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    // 0 means unlimited.
    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Listed under the promo box at checkout when true. Defaults to false on
    // purpose: a code created for one customer — an apology, a partnership,
    // a test — must not turn up on every shopper's cart because someone
    // forgot to hide it. Opting in is a decision; opting out shouldn't be.
    isPublic: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

couponSchema.methods.discountFor = function (subtotal) {
  const raw =
    this.type === 'percent' ? Math.round((subtotal * this.value) / 100) : this.value;
  const capped = this.maxDiscount > 0 ? Math.min(raw, this.maxDiscount) : raw;
  // Never discount below zero — a fixed coupon worth more than the basket
  // would otherwise produce a negative total.
  return Math.max(0, Math.min(capped, subtotal));
};

export default mongoose.model('Coupon', couponSchema);
