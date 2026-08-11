import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Sub-schemas
const reviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const galleryImageSchema = new Schema(
  {
    full: {
      type: String,
      required: [true, 'Full size image URL is required'],
      trim: true,
    },
    thumbnail: {
      type: String,
      required: [true, 'Thumbnail URL is required'],
      trim: true,
    },
  },
  { _id: false }
);

const breadcrumbSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Breadcrumb name is required'],
    trim: true,
  },
  requestPath: {
    type: String,
    required: [true, 'Breadcrumb path is required'],
    trim: true,
  },
});

const configurableOptionValueSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    valueIndex: {
      type: String,
      required: [true, 'Value index is required'],
    },
    label: {
      type: String,
      required: [true, 'Value label is required'],
    },
    value: {
      type: String,
      default: function () {
        // If value is not provided, use the label in a URL-friendly format
        return this.label ? this.label.toLowerCase().replace(/\s+/g, '-') : '';
      },
    },
    inStock: {
      type: [String],
      default: [],
      // Convert single value to array if needed
      set: function (inStock) {
        if (!inStock) return [];
        return Array.isArray(inStock) ? inStock : [inStock];
      },
    },
  },
  { _id: true, strict: false } // Allow additional fields
);

const configurableOptionSchema = new Schema(
  {
    _id: {
      type: Schema.Types.Mixed, // Can be String or ObjectId
      default: () => new mongoose.Types.ObjectId(),
    },
    attributeId: {
      type: String,
      required: [true, 'Attribute ID is required'],
    },
    label: {
      type: String,
      required: [true, 'Option label is required'],
    },
    productId: {
      type: Schema.Types.Mixed, // Can be String or ObjectId
      ref: 'Product',
      required: false, // Make it not required
    },
    values: {
      type: [configurableOptionValueSchema],
      default: [],
      required: true,
    },
  },
  { _id: true, strict: false } // Allow additional fields
);

// SEO Schema
const seoSchema = new Schema(
  {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters'],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug can only contain letters, numbers, and hyphens',
      ],
    },
  },
  { _id: false }
);

// Main Product Schema
const productSchema = new Schema(
  {
    // Core product information
    id: {
      type: Number,
      unique: true,
      sparse: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    typeId: {
      type: String,
      enum: [
        'simple',
        'configurable',
        'bundle',
        'grouped',
        'virtual',
        'downloadable',
      ],
      default: 'simple',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor is required'],
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    shortDescription: {
      type: String,
      default: '',
    },

    // Pricing
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      get: (v) => parseFloat(v).toFixed(2),
      set: (v) => parseFloat(v),
    },
    currency: {
      type: String,
      enum: ['KES', 'USD', 'TZS', 'UGX'],
      default: 'KES',
    },
    specialPrice: {
      type: Number,
      min: [0, 'Special price cannot be negative'],
      default: null,
      get: (v) => (v ? parseFloat(v).toFixed(2) : null),
      set: (v) => (v ? parseFloat(v) : null),
    },

    // SEO Information
    seo: seoSchema,

    // Rating and Reviews
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (v) => Math.round(v * 10) / 10,
      },
      count: {
        type: Number,
        default: 0,
      },
      verified: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
          set: (v) => Math.round(v * 10) / 10,
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    },
    reviews: [reviewSchema],

    // Product details
    brand: {
      type: String,
      trim: true,
    },
    productMpn: {
      type: String,
      default: null,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    returnsPolicy: {
      type: String,
      default: null,
    },
    warranty: {
      type: String,
      default: null,
    },

    // Media
    thumbnail: {
      type: String,
      required: [true, 'Thumbnail URL is required'],
      validate: {
        validator: function (v) {
          return /^https?:\/\//.test(v);
        },
        message: 'Please provide a valid thumbnail URL',
      },
    },
    gallery: [galleryImageSchema],

    // Stock
    stock: {
      qty: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0,
      },
      status: {
        type: String,
        enum: ['in_stock', 'out_of_stock', 'backorder', 'preorder'],
        default: 'in_stock',
      },
    },

    // Navigation
    urlPath: {
      type: String,
      required: [true, 'URL path is required'],
      trim: true,
      unique: true,
    },
    breadcrumbs: [breadcrumbSchema],

    // Configurable Options
    configurableOptions: [configurableOptionSchema],

    // System
    isActive: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      // `_id` stays. `virtuals: true` already adds an `id` alias, and this
      // transform used to delete `_id` in favour of it — but only for
      // serialized *documents*. The product list endpoints go through
      // `.lean()`, which skips toJSON entirely and returns `_id`, so the
      // frontend keyed everything on `_id` and `GET /product/:id` was the one
      // response that didn't have it. Adding a product to the cart from the
      // product page stored an item with no `_id`, which made its cart row
      // link to `/product/undefined` and its quantity and remove buttons
      // no-ops. Keeping both is additive: `id` is still there for anything
      // that reads it.
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      getters: true,
    },
  }
);

// Text search index
productSchema.index({
  name: 'text',
  description: 'text',
  'configurableOptions.label': 'text',
});

// Single field indexes
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ brand: 1 });
productSchema.index({ typeId: 1 });
productSchema.index({ 'stock.qty': 1 });
productSchema.index({ 'stock.status': 1 });
productSchema.index({ 'configurableOptions.attributeId': 1 });
productSchema.index({ 'configurableOptions.values.inStock': 1 });
productSchema.index({ likes: -1 });

// Compound indexes
productSchema.index({
  'rating.average': -1,
  'rating.count': -1,
});
productSchema.index({
  'rating.verified.average': -1,
  'rating.verified.count': -1,
});
productSchema.index({
  'reviews.verifiedPurchase': 1,
});
productSchema.index(
  {
    'seo.slug': 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

// Virtual for product URL
productSchema.virtual('url').get(function () {
  return this.seo?.slug || `/products/${this._id}`;
});

// Method to update stock
productSchema.methods.updateStock = function (qty) {
  this.stock.qty = qty;
  this.stock.status = qty > 0 ? 'in_stock' : 'out_of_stock';
  return this.save();
};

// Review and Rating Methods
productSchema.methods.addReview = async function (
  userId,
  rating,
  comment,
  verifiedPurchase = false
) {
  // Check for existing review
  const existingReview = this.reviews.find(
    (review) => review.user.toString() === userId.toString()
  );

  if (existingReview) {
    throw new Error('You have already reviewed this product');
  }

  // Add new review
  this.reviews.push({
    user: userId,
    rating,
    comment,
    verifiedPurchase,
  });

  // Update rating stats
  return this.updateRatingStats();
};

productSchema.methods.updateRatingStats = async function () {
  if (this.reviews.length === 0) {
    this.rating = {
      average: 0,
      count: 0,
      verified: { average: 0, count: 0 },
    };
    return this.save();
  }

  // Calculate overall stats
  const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = total / this.reviews.length;

  // Calculate verified purchase stats
  const verifiedReviews = this.reviews.filter((r) => r.verifiedPurchase);
  const verifiedTotal = verifiedReviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );
  const verifiedAverage =
    verifiedReviews.length > 0 ? verifiedTotal / verifiedReviews.length : 0;

  // Update the product
  this.rating = {
    average,
    count: this.reviews.length,
    verified: {
      average: verifiedAverage,
      count: verifiedReviews.length,
    },
  };

  return this.save();
};

// Static Methods
productSchema.statics.getTopRated = function (limit = 10, minReviews = 1) {
  return this.aggregate([
    {
      $match: {
        'rating.count': { $gte: minReviews },
        'rating.average': { $gt: 0 },
      },
    },
    {
      $addFields: {
        // Use a weighted rating formula (Bayesian average)
        weightedRating: {
          $divide: [
            {
              $add: [
                { $multiply: [3.5, 10] }, // Prior average (3.5) * minimum votes (10)
                { $multiply: ['$rating.average', '$rating.count'] },
              ],
            },
            { $add: [10, '$rating.count'] }, // Minimum votes (10) + current count
          ],
        },
      },
    },
    { $sort: { weightedRating: -1 } },
    { $limit: limit },
  ]);
};

// Pre-save hook to ensure data consistency
productSchema.pre('save', function (next) {
  // Ensure URL path is URL-friendly
  if (this.isModified('name') && !this.urlPath) {
    this.urlPath = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  // Update stock status based on quantity
  if (this.isModified('stock.qty')) {
    if (this.stock.qty > 0) {
      this.stock.status = 'in_stock';
    } else {
      this.stock.status = 'out_of_stock';
    }
  }

  // Ensure special price is not greater than regular price
  if (this.specialPrice && this.specialPrice > this.price) {
    this.specialPrice = this.price;
  }

  next();
});

// Static method to find products by brand
productSchema.statics.findByBrand = function (brand, limit = 10) {
  return this.find({ brand: new RegExp(brand, 'i'), 'stock.isInStock': true })
    .limit(limit)
    .sort({ 'stock.qty': -1 });
};

// Static method to find similar products
productSchema.statics.findSimilar = function (productId, limit = 4) {
  return this.aggregate([
    { $match: { _id: { $ne: productId }, 'stock.isInStock': true } },
    { $sample: { size: limit } },
  ]);
};

// Method to update likes
productSchema.methods.updateLikes = function (increment = true) {
  this.likes = increment ? this.likes + 1 : Math.max(0, this.likes - 1);
  return this.save();
};

// Method to check if product is available
productSchema.methods.isAvailable = function () {
  return this.stock.status === 'in_stock' || this.stock.status === 'backorder';
};

// Virtual for isInStock to maintain backward compatibility
productSchema.virtual('isInStock').get(function () {
  return this.stock.status === 'in_stock' || this.stock.status === 'backorder';
});

const Product = model('Product', productSchema);

export default Product;
