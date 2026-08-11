import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

/**
 * ## The catalogue's taxonomy
 *
 * This replaces a 310-line model that could never have been loaded: it ended
 * in `module.exports` inside an ESM package, called a `slugify` it never
 * imported, declared `image`, `displayOrder` and `isActive` twice each, and
 * indexed and wrote fields (`ancestors`, `shortDescription`) that weren't in
 * its own schema. Nothing imported it, which is why none of that ever
 * surfaced. It was a copy of a generic catalogue model rather than a
 * description of this shop, so what follows is deliberately smaller: the
 * fields the storefront and the admin screen actually read.
 *
 * ### Products join by slug, not by id
 *
 * `Product.category` is a plain string — `'gaming'`, `'smartphones'` — set by
 * the scrape and by the vendor product form, and it's what the PLP filters on
 * and what appears in `/products?category=…`. That's the join key, so the
 * slug is a real identifier and not a display detail: `renameSlug` below is
 * the only safe way to change one, because the products have to move with it.
 *
 * Keeping products on the string (rather than migrating 900 rows onto an
 * ObjectId ref) also means a category row can be added, edited or removed
 * without the catalogue depending on the row existing. The storefront falls
 * back to a static list when the API is unreachable.
 */
const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
      maxlength: [60, 'Category name cannot exceed 60 characters'],
    },

    /**
     * Lowercase, hyphenated, and the value stored on every product in it.
     * Generated from the name when absent; never regenerated on rename,
     * because a slug that silently changed would orphan the whole category's
     * products and break every link to it that anyone had saved.
     */
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        'Slug can only contain lowercase letters, numbers and hyphens',
      ],
    },

    // Shown under the heading on the category's own listing page. One or two
    // sentences; it is not a place for marketing claims the shop can't keep.
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },

    /**
     * Optional artwork. Optional in the real sense: every surface that can use
     * it also renders without it — the storefront's category row falls back to
     * the lucide icon it has always used, and the admin table shows a
     * monogram. A category with no photograph must not look like a broken one.
     */
    thumbnail: {
      url: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || /^https?:\/\//.test(v),
          message: 'Image URL must start with http:// or https://',
        },
      },
      alt: {
        type: String,
        trim: true,
        maxlength: [120, 'Alt text cannot exceed 120 characters'],
      },
    },

    /** Sub-categories. One level is what the storefront renders today. */
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },

    // Manual ordering for the nav row and the admin table. Ties break on name,
    // so leaving every category at 0 gives a stable alphabetical list rather
    // than insertion order.
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Hidden from the storefront without deleting the row or touching the
    // products in it — the right move for a category that's out of season.
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Promoted onto the home page's category row.
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// The two lists this model serves: the storefront's (active, ordered) and the
// admin's (everything, same order).
categorySchema.index({ isActive: 1, displayOrder: 1, name: 1 });

/** Fill in a slug from the name when the caller didn't supply one. */
categorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

/**
 * Move a category to a new slug, taking its products with it.
 *
 * The two writes can't be one atomic operation on a standalone Mongo, so the
 * products move **first**: if the second write fails, products point at a slug
 * with no category row, which the storefront already tolerates (it lists
 * whatever `Product.category` values exist). The reverse order would leave the
 * category renamed and every product in it invisible.
 */
categorySchema.statics.renameSlug = async function (category, nextSlug) {
  const Product = mongoose.model('Product');
  const previous = category.slug;
  if (previous === nextSlug) return { moved: 0 };

  const result = await Product.updateMany(
    { category: previous },
    { $set: { category: nextSlug } },
  );

  category.slug = nextSlug;
  await category.save();

  return { moved: result.modifiedCount || 0 };
};

/**
 * How many products sit under each slug — counted from the products
 * themselves, so it can't drift the way a stored counter would, and so a slug
 * with stock but no category row still shows up in the admin screen as
 * something to explain.
 */
categorySchema.statics.productCounts = async function () {
  const Product = mongoose.model('Product');
  const rows = await Product.aggregate([
    { $match: { isActive: { $ne: false } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
};

export default mongoose.model('Category', categorySchema);
