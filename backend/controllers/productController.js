import { StatusCodes } from 'http-status-codes';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../errors/customErrors.js';
import APIFeatures from '../utils/apiFeatures.js';

// Cloudinary env vars are unconfigured in this project (see CLAUDE.md) — the
// vendor/admin product forms take plain image URLs directly instead of
// uploading files, so no image-hosting step is needed here.

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// A vendor may only ever touch their own products; admins can touch any.
const assertOwnsProduct = (product, user) => {
  if (user.role === 'admin') return;
  if (product.vendor.toString() !== user.id) {
    throw new ForbiddenError('Not authorized to modify this product');
  }
};

export const newProduct = async (req, res) => {
  req.body.vendor = req.user.id;

  if (!req.body.urlPath) {
    req.body.urlPath = `${slugify(req.body.name || '')}-${Date.now()}`;
  }
  if (!req.body.sku) {
    req.body.sku = `SKU-${Date.now()}`;
  }

  const product = await Product.create(req.body);
  res.status(StatusCodes.CREATED).json({
    success: true,
    product,
  });
};

// Fields the dashboard product tables actually render. Without this
// projection a full catalog page ships descriptions, galleries, reviews,
// breadcrumbs and configurableOptions — ~12KB per product, so the admin list
// was a 10.7MB response for 902 rows.
const LIST_FIELDS = 'name sku thumbnail category price specialPrice stock isActive vendor updatedAt';

// Shared paging/search/sort for the vendor + admin product tables.
const buildListQuery = (req, baseFilter) => {
  const { search, category, stockStatus, sort, page = 1, limit = 20 } = req.query;
  const filter = { ...baseFilter };

  if (search?.trim()) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  if (category && category !== 'all') filter.category = category;
  if (stockStatus && stockStatus !== 'all') filter['stock.status'] = stockStatus;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  return { filter, pageNum, limitNum, sort: sort || '-updatedAt' };
};

const respondWithProductPage = async (req, res, baseFilter, { populateVendor = false } = {}) => {
  const { filter, pageNum, limitNum, sort } = buildListQuery(req, baseFilter);

  // .lean() matters here — the schema's toJSON transform strips `_id` from
  // hydrated documents, and the frontend needs a real id to build edit and
  // delete links. .lean() returns plain objects that skip that transform.
  // `_id` is appended as a tiebreaker: skip/limit over a sort key with
  // duplicate values (e.g. products bulk-updated in the same operation share
  // an `updatedAt`) has no stable order, so the same row can appear on two
  // pages while another is skipped entirely.
  let query = Product.find(filter)
    .select(LIST_FIELDS)
    .sort(`${sort} _id`)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  if (populateVendor) {
    query = query.populate('vendor', 'firstName lastName email vendorInfo.businessName');
  }

  const [products, total] = await Promise.all([query, Product.countDocuments(filter)]);

  res.status(StatusCodes.OK).json({
    success: true,
    products,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  });
};

// Get products belonging to the authenticated vendor => GET /api/v1/vendor/products
export const getVendorProducts = async (req, res) => {
  await respondWithProductPage(req, res, { vendor: req.user.id });
};

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res, next) => {
  // 1) Parse query parameters
  const {
    search,
    categories,
    brand,
    minPrice,
    maxPrice,
    sort = '-createdAt',
    inStock,
    onSale,
    priceRange,
    rating,
    typeId,
    stockStatus,
    minQty,
    allowBackorder,
    page = 1,
    limit,
  } = req.query;

  // 2) Build the base query
  const query = { isActive: true };
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 0;
  const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

  // 3) Handle search functionality
  if (search && search.trim()) {
    try {
      const searchTerm = search.trim();
      if (searchTerm.length < 2) {
        return res.status(200).json({
          success: true,
          count: 0,
          products: [],
          totalPages: 0,
          currentPage: pageNum,
          message: 'Search term must be at least 2 characters',
        });
      }

      const searchRegex = new RegExp(
        searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );

      // Add search conditions to query
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { sku: { $regex: searchRegex } },
            { 'configurableOptions.values.sku': { $regex: searchRegex } },
          ],
        },
      ];
    } catch (error) {
      console.error('Search error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error performing search',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // 4) Stock status filter
  if (stockStatus) {
    if (stockStatus === 'in_stock') {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            // Simple products in stock
            {
              typeId: 'simple',
              $or: [
                { 'stock.status': 'in_stock' },
                { 'stock.status': 'backorder' },
                {
                  'stock.status': { $exists: false },
                  'stock.qty': { $gt: 0 },
                },
              ],
            },
            // Configurable products with any variant in stock
            {
              typeId: 'configurable',
              'configurableOptions.values': {
                $elemMatch: {
                  inStock: { $exists: true, $not: { $size: 0 } },
                },
              },
            },
          ],
        },
      ];
    } else if (stockStatus === 'out_of_stock') {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            // Simple products out of stock
            {
              typeId: 'simple',
              $or: [
                { 'stock.status': 'out_of_stock' },
                {
                  $and: [
                    { 'stock.status': { $ne: 'backorder' } },
                    { 'stock.qty': { $lte: 0 } },
                  ],
                },
              ],
            },
            // Configurable products with no variants in stock
            {
              typeId: 'configurable',
              $or: [
                // No configurable options
                { configurableOptions: { $exists: false } },
                { configurableOptions: { $size: 0 } },
                // Or no variants with inStock values
                {
                  'configurableOptions.values': {
                    $not: {
                      $elemMatch: {
                        inStock: { $exists: true, $not: { $size: 0 } },
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ];
    }
  }

  // 5) Categories filter
  if (categories) {
    const categoryList = Array.isArray(categories) ? categories : [categories];
    if (categoryList.length > 0) {
      query.category = { $in: categoryList };
    }
  }

  // 6) Product type filter
  if (typeId) {
    query.typeId = typeId;
  }

  // 6b) Brand filter
  if (brand) {
    const brandList = Array.isArray(brand) ? brand : brand.split(',');
    if (brandList.length > 0) {
      query.brand = { $in: brandList };
    }
  }

  // 7) In Stock filter (legacy)
  if (inStock === 'true') {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { 'stock.status': 'in_stock' },
          { 'stock.quantity': { $gt: 0 } },
          {
            typeId: 'configurable',
            'configurableOptions.values.inStock': { $gt: 0 },
          },
        ],
      },
    ];
  }

  // 8) On Sale filter
  if (onSale === 'true') {
    query.specialPrice = { $exists: true, $ne: null, $gt: 0 };
  }

  // 9) Price range filter
  if (minPrice || maxPrice || (priceRange && priceRange !== 'all')) {
    let priceQuery = {};

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) priceQuery.$gte = min;
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) priceQuery.$lte = max;
    }

    if (
      Object.keys(priceQuery).length === 0 &&
      priceRange &&
      priceRange !== 'all'
    ) {
      const ranges = {
        under1000: { $lt: 1000 },
        '1000-5000': { $gte: 1000, $lte: 5000 },
        '5000-10000': { $gte: 5000, $lte: 10000 },
        '10000-20000': { $gte: 10000, $lte: 20000 },
        over20000: { $gt: 20000 },
      };
      if (ranges[priceRange]) {
        priceQuery = { ...ranges[priceRange] };
      }
    }

    if (Object.keys(priceQuery).length > 0) {
      const priceConditions = [
        { price: priceQuery },
        {
          $and: [
            { specialPrice: { $exists: true, $ne: null } },
            { specialPrice: priceQuery },
          ],
        },
      ];

      const newQuery = {
        $and: [{ ...query }, { $or: priceConditions }],
      };

      Object.assign(query, newQuery);
    }
  }

  // 10) Rating filter — "4 stars & up", the way every shop words it.
  //
  // This used to compare `rating` itself against a number, but `rating` is a
  // subdocument (`{ average, count, verified }`), so the filter matched
  // nothing whatever was passed. It also bracketed the value (`>= 4 < 5`),
  // which excluded the best-rated products from a four-star filter.
  if (rating) {
    const ratingNum = parseFloat(rating);
    if (!isNaN(ratingNum)) {
      query['rating.average'] = { $gte: ratingNum };
    }
  }

  // 11) Minimum quantity filter
  if (minQty) {
    const minQtyNum = parseInt(minQty);
    if (!isNaN(minQtyNum)) {
      query['stock.quantity'] = { $gte: minQtyNum };
    }
  }

  // 12) Allow backorder filter
  if (allowBackorder === 'false') {
    query['stock.allowBackorder'] = false;
  }

  // 13) Execute the query
  try {
    // Default to no limit if not specified
    const limitNum = limit ? parseInt(limit) : 0;
    const skip = page > 1 ? (page - 1) * (limitNum || 0) : 0;

    // Sorting options
    const sortOptions = {
      newest: '-createdAt',
      priceAsc: 'price',
      priceDesc: '-price',
      rating: '-rating.average',
      nameAsc: 'name',
      nameDesc: '-name',
      bestSelling: '-soldCount',
      mostViewed: '-viewCount',
      mostPopular: '-likes',
      topRated: '-rating.average',
    };

    const sortBy = sortOptions[sort] || sort || '-createdAt';

    // Build the query
    let productsQuery = Product.find(query)
      .select(
        'name price specialPrice stock typeId thumbnail category rating configurableOptions'
      )
      .populate('category', 'name slug')
      .populate('vendor', 'firstName lastName email')
      .sort(sortBy)
      .skip(skip);

    // Only apply limit if it's greater than 0
    if (limitNum > 0) {
      productsQuery = productsQuery.limit(limitNum);
    }

    productsQuery = productsQuery.lean();

    // Execute query
    console.log('Sorting by:', sortBy);

    const [products, total] = await Promise.all([
      productsQuery.exec(),
      Product.countDocuments(query).then((count) => {
        console.log(`Found ${count} products matching the query`);
        return count;
      }),
    ]);
    console.log(`Returning ${products.length} products`);

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      productCount: total,
      resultsPerPage: limitNum,
      totalPages,
      currentPage: pageNum,
      products: products.map((product) => ({
        ...product,
        isInStock:
          product.stock?.status === 'in_stock' ||
          product.stock?.status === 'backorder' ||
          (product.typeId === 'configurable' &&
            product.configurableOptions?.some((opt) =>
              opt.values?.some((v) => v.inStock?.length > 0)
            )),
      })),
    });
  } catch (error) {
    console.error('Error getting products:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Get filter facets (brands, price bounds) for the current category
// @route   GET /api/v1/products/facets
// @access  Public
export const getProductFacets = async (req, res) => {
  const { categories } = req.query;
  const match = { isActive: true };

  if (categories) {
    const categoryList = Array.isArray(categories)
      ? categories
      : categories.split(',');
    if (categoryList.length > 0) {
      match.category = { $in: categoryList };
    }
  }

  const [brands, priceBounds] = await Promise.all([
    Product.distinct('brand', { ...match, brand: { $nin: [null, ''] } }),
    Product.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          min: { $min: '$price' },
          max: { $max: '$price' },
        },
      },
    ]),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    brands: brands.sort((a, b) => a.localeCompare(b)),
    priceRange: {
      min: priceBounds[0]?.min ?? 0,
      max: priceBounds[0]?.max ?? 0,
    },
  });
};

// get all products (admin) => /api/v1/admin/products
export const getAdminProducts = async (req, res) => {
  const baseFilter = {};
  if (req.query.vendor && req.query.vendor !== 'all') {
    baseFilter.vendor = req.query.vendor;
  }
  await respondWithProductPage(req, res, baseFilter, { populateVendor: true });
};

export const getSingleProduct = async (req, res) => {
  const { id: productId } = req.params;
  // The vendor is populated for the "Sold by" line on the product page — a
  // marketplace PDP has to say who you're actually buying from.
  const product = await Product.findById(productId).populate(
    'vendor',
    'firstName lastName vendorInfo.businessName'
  );
  if (!product) {
    throw new NotFoundError('product not found');
  }
  res.status(StatusCodes.OK).json({ success: true, product });
};

export const updateProduct = async (req, res) => {
  const { id: productId } = req.params;
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('product not found');
  }
  assertOwnsProduct(product, req.user);

  // Vendors can't reassign a product to another vendor.
  delete req.body.vendor;

  const updated = await Product.findByIdAndUpdate(productId, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(StatusCodes.OK).json({ success: true, product: updated });
};

export const deleteProduct = async (req, res) => {
  const { id: productId } = req.params;
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('product not found');
  }
  assertOwnsProduct(product, req.user);

  await product.deleteOne();
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'product is deleted',
  });
};


/**
 * ## Reviews
 *
 * The three handlers below replace an earlier set that couldn't work:
 *
 *  - They wrote `product.ratings` and `product.numOfReviews`. Neither field is
 *    on the schema, which keeps its averages in `rating.average` /
 *    `rating.count` (plus a separate verified-purchase pair). Mongoose dropped
 *    the writes, so a product's rating never changed no matter how many
 *    reviews it collected.
 *  - The duplicate check compared an ObjectId to a string with `===`, so it
 *    never matched — the "user shouldn't submit multiple reviews" TODO left in
 *    the code was describing this.
 *  - Deleting recomputed the average from the *pre-delete* array and divided
 *    by the post-delete length, and dividing by zero on the last review left
 *    `NaN` in the document.
 *  - Anyone signed in could delete anyone's review: no owner check.
 *  - Listing reviews required a login, so a shopper deciding whether to buy
 *    couldn't read them.
 *
 * `Product.updateRatingStats()` already did this arithmetic correctly and was
 * simply never called. It is now the only thing that writes a rating.
 */

/** Star counts for the 1–5 histogram the product page draws. */
const ratingBreakdown = (reviews) =>
  reviews.reduce(
    (acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );

/**
 * Did this person actually buy the thing? Only a delivered order counts —
 * "verified" has to mean the product reached them, or the badge is just a
 * record that they once clicked Place order.
 */
const hasPurchased = async (userId, productId) =>
  Boolean(
    await Order.exists({
      user: userId,
      status: 'delivered',
      'items.product': productId,
    })
  );

// Get a product's reviews => GET /api/v1/products/:id/reviews
// Public: reviews are for people deciding whether to buy.
export const getProductReviews = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

  const product = await Product.findById(req.params.id)
    .select('reviews rating')
    .populate('reviews.user', 'firstName lastName')
    .lean();

  if (!product) {
    throw new NotFoundError('product not found');
  }

  // Newest first — the default every shop uses, and the only ordering this
  // data can justify (nothing records whether a review was helpful).
  const all = [...(product.reviews || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.status(StatusCodes.OK).json({
    success: true,
    reviews: all.slice((page - 1) * limit, page * limit),
    total: all.length,
    page,
    totalPages: Math.ceil(all.length / limit) || 0,
    rating: product.rating || { average: 0, count: 0 },
    breakdown: ratingBreakdown(all),
  });
};

// Create or update your review => POST /api/v1/products/:id/reviews
// One review per person per product: posting again edits the one you left,
// which is what every shop does and what the old duplicate check was for.
export const createProductReview = async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BadRequestError('Please give a rating between 1 and 5 stars');
  }
  if (!comment) {
    throw new BadRequestError('Please write a few words about the product');
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new NotFoundError('product not found');
  }

  const verifiedPurchase = await hasPurchased(req.user.id, product._id);
  const existing = product.reviews.find(
    (review) => review.user.toString() === req.user.id
  );

  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    // Re-checked on every edit: an order delivered since the review was first
    // written should earn the badge.
    existing.verifiedPurchase = verifiedPurchase;
  } else {
    product.reviews.push({
      user: req.user.id,
      rating,
      comment,
      verifiedPurchase,
    });
  }

  // Saves the product as well as recalculating the averages.
  await product.updateRatingStats();

  const saved = product.reviews.find(
    (review) => review.user.toString() === req.user.id
  );

  res.status(existing ? StatusCodes.OK : StatusCodes.CREATED).json({
    success: true,
    message: existing ? 'Review updated' : 'Review submitted',
    review: saved,
    rating: product.rating,
  });
};

// Delete a review => DELETE /api/v1/products/:id/reviews/:reviewId
// Your own, or anyone's if you're an admin.
export const deleteReview = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new NotFoundError('product not found');
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) {
    throw new NotFoundError('review not found');
  }

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('Not authorized to delete this review');
  }

  product.reviews.pull(req.params.reviewId);
  await product.updateRatingStats();

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Review deleted',
    rating: product.rating,
  });
};
