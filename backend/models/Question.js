import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * ## Product questions
 *
 * Reviews tell you how a product turned out for someone who bought it.
 * Questions are the other half: what a shopper needs to know *before* they
 * buy, answered by whoever is selling it. "Does it ship with the Kenyan plug?"
 * is not a review and has nowhere else to go.
 *
 * ### Why a collection, and not `Product.reviews`-style embedding
 *
 * Reviews are embedded, and that works because they're only ever read one
 * product at a time. Questions have a second reader with the opposite access
 * pattern: a vendor needs "everything anyone has asked me and I haven't
 * answered", across their whole catalogue. Embedded, that's a scan of every
 * product document with an unindexable `$size` predicate on a nested array.
 * As its own collection it's one indexed query.
 */

const answerSchema = new Schema(
  {
    body: {
      type: String,
      required: [true, 'An answer needs some text'],
      trim: true,
      maxlength: [1000, 'Answer cannot exceed 1000 characters'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /**
     * Captured when the answer is written, not read from the author's account
     * at display time. The badge next to an answer is a claim about who was
     * speaking *then* — an account later promoted to admin didn't answer as
     * one, and re-labelling old answers would rewrite that.
     */
    authorRole: {
      type: String,
      enum: ['vendor', 'admin'],
      required: true,
    },
  },
  { timestamps: true },
);

const questionSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    /**
     * Denormalised from the product when the question is asked, for the same
     * reason order line items carry one: it's what scopes a vendor's queue,
     * and a join per question to find out isn't worth it. It also pins the
     * question to whoever was selling at the time.
     */
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    body: {
      type: String,
      required: [true, 'Please write your question'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },

    answers: [answerSchema],

    /**
     * Kept in step with `answers.length` by the pre-save hook below.
     *
     * A boolean because the query the vendor queue runs — "mine, unanswered,
     * oldest first" — needs an index, and `{ answers: { $size: 0 } }` can't
     * use one. Never set it by hand.
     */
    isAnswered: {
      type: Boolean,
      default: false,
    },

    /**
     * Admin moderation. Hidden rather than deleted, so a question taken down
     * for language can be put back, and so the person who asked doesn't watch
     * it vanish without trace.
     */
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// The product page: this product's published questions, newest first.
questionSchema.index({ product: 1, isPublished: 1, createdAt: -1 });
// The vendor queue: mine, unanswered, oldest first (longest-waiting on top).
questionSchema.index({ vendor: 1, isAnswered: 1, createdAt: 1 });

questionSchema.pre('save', function (next) {
  this.isAnswered = (this.answers?.length || 0) > 0;
  next();
});

export default mongoose.model('Question', questionSchema);
