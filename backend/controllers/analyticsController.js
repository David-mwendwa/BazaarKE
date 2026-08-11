import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { BadRequestError } from '../errors/customErrors.js';

/**
 * ## Analytics
 *
 * Everything below is computed from orders, products and users as they already
 * exist. There is no events table, no session tracking and no pixel, so there
 * are no funnels, no conversion rates and no traffic numbers here — those
 * would need data nothing in this app collects, and a chart of numbers nobody
 * measures is worse than no chart.
 *
 * What the data *can* answer: what sold, when, to whom, for how much, and
 * what's about to run out. That's what these two endpoints return.
 *
 * ### What counts as revenue
 *
 * `status` not in (`cancelled`, `refunded`). A cancelled order released its
 * stock and its coupon; counting its money would make every chart drift upward
 * from reality. Payment status is deliberately *not* the filter — cash on
 * delivery is `payment.status: 'pending'` for its whole life, and excluding it
 * would hide most of this shop's sales. Money that was ordered but never
 * collected is a separate question, and `unpaidValue` answers it.
 *
 * ### Vendor scope
 *
 * A vendor's figures come from their line items, not from whole orders: an
 * order containing two sellers' products belongs to both, and each must see
 * only their own half. That's the same `items.vendor` field `getVendorOrders`
 * scopes on. Promo codes are platform-funded (see `orderController`), so a
 * vendor's revenue is the full price of their lines regardless of what the
 * customer paid — which is why these numbers can exceed the order totals an
 * admin sees, and why `platformDiscount` is reported alongside.
 */

/** Ranges the dashboards offer, in days. `all` is resolved from the data. */
const RANGES = {
  '7d': { days: 7, label: 'Last 7 days' },
  '30d': { days: 30, label: 'Last 30 days' },
  '90d': { days: 90, label: 'Last 90 days' },
  '12m': { days: 365, label: 'Last 12 months' },
  all: { days: null, label: 'All time' },
};

const EXCLUDED_STATUSES = ['cancelled', 'refunded'];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Resolve `?range=` into a window, the equal-length window before it (for the
 * period-on-period comparison), and the bucket size the chart should use.
 *
 * `all` has no preceding window, so its comparison is omitted rather than
 * computed against nothing — a "+100%" against an empty period is noise.
 */
const resolveRange = async (key, scopeMatch) => {
  const preset = RANGES[key] || RANGES['30d'];
  const to = new Date();

  if (preset.days === null) {
    const first = await Order.findOne(scopeMatch).sort({ createdAt: 1 }).select('createdAt').lean();
    const from = first ? startOfDay(first.createdAt) : startOfDay(to);
    const spanDays = Math.max(1, Math.ceil((to - from) / 86400000));
    return {
      key: 'all',
      label: preset.label,
      from,
      to,
      previous: null,
      granularity: spanDays > 92 ? 'month' : 'day',
    };
  }

  const from = startOfDay(new Date(to.getTime() - (preset.days - 1) * 86400000));
  const previousFrom = startOfDay(new Date(from.getTime() - preset.days * 86400000));

  return {
    key,
    label: preset.label,
    from,
    to,
    previous: { from: previousFrom, to: from },
    // Daily bars stop being readable somewhere past a quarter; a year of them
    // is 365 columns in a card that's 600px wide.
    granularity: preset.days > 92 ? 'month' : 'day',
  };
};

/** `null` when there's nothing to compare against — the UI omits the chip. */
const percentChange = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

/** Zero-fills the gaps, so a quiet Tuesday is a gap in the line, not missing. */
const fillSeries = (rows, { from, to, granularity }) => {
  const byKey = new Map(rows.map((row) => [row._id, row]));
  const out = [];

  const cursor = granularity === 'month' ? new Date(from.getFullYear(), from.getMonth(), 1) : startOfDay(from);

  while (cursor <= to) {
    const key =
      granularity === 'month'
        ? `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
        : cursor.toISOString().slice(0, 10);

    const row = byKey.get(key);
    out.push({
      date: key,
      revenue: Math.round(row?.revenue || 0),
      orders: row?.orders || 0,
      units: row?.units || 0,
    });

    if (granularity === 'month') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }

  return out;
};

/**
 * The `$dateToString` format for a bucket. Timezone-pinned to Africa/Nairobi so
 * a sale at 9pm local doesn't land on the next day's bar — the shop, its
 * customers and whoever reads this chart are all in one timezone, and UTC
 * bucketing would quietly shift three hours of every evening forward a day.
 */
const bucketExpr = (granularity) => ({
  $dateToString: {
    format: granularity === 'month' ? '%Y-%m' : '%Y-%m-%d',
    date: '$createdAt',
    timezone: 'Africa/Nairobi',
  },
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const adminTotals = async (window) => {
  const match = {
    createdAt: { $gte: window.from, $lte: window.to },
    status: { $nin: EXCLUDED_STATUSES },
  };

  const [row] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$total.amount' },
        orders: { $sum: 1 },
        units: { $sum: { $sum: '$items.quantity' } },
        discountGiven: { $sum: { $ifNull: ['$discount.amount', 0] } },
        deliveryCharged: { $sum: { $ifNull: ['$shipping.amount', 0] } },
        customers: { $addToSet: '$user' },
        unpaidValue: {
          $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 0, '$total.amount'] },
        },
      },
    },
  ]);

  const newCustomers = await User.countDocuments({
    role: 'user',
    createdAt: { $gte: window.from, $lte: window.to },
  });

  const revenue = Math.round(row?.revenue || 0);
  const orders = row?.orders || 0;

  return {
    revenue,
    orders,
    units: row?.units || 0,
    averageOrderValue: orders ? Math.round(revenue / orders) : 0,
    customers: row?.customers?.filter(Boolean).length || 0,
    newCustomers,
    discountGiven: Math.round(row?.discountGiven || 0),
    deliveryCharged: Math.round(row?.deliveryCharged || 0),
    unpaidValue: Math.round(row?.unpaidValue || 0),
  };
};

/** GET /api/v1/analytics/admin */
export const getAdminAnalytics = async (req, res) => {
  const window = await resolveRange(req.query.range, {});
  const match = {
    createdAt: { $gte: window.from, $lte: window.to },
    status: { $nin: EXCLUDED_STATUSES },
  };

  const [
    totals,
    previous,
    seriesRows,
    statusRows,
    paymentRows,
    topProducts,
    topCategories,
    topVendors,
    catalogue,
  ] = await Promise.all([
    adminTotals(window),
    window.previous ? adminTotals({ from: window.previous.from, to: window.previous.to }) : null,

    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: bucketExpr(window.granularity),
          revenue: { $sum: '$total.amount' },
          orders: { $sum: 1 },
          units: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]),

    // Every status, including the excluded ones — this breakdown is where a
    // cancellation rate is supposed to be visible.
    Order.aggregate([
      { $match: { createdAt: { $gte: window.from, $lte: window.to } } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$total.amount' } } },
      { $sort: { count: -1 } },
    ]),

    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { method: '$payment.method', status: '$payment.status' },
          count: { $sum: 1 },
          value: { $sum: '$total.amount' },
        },
      },
    ]),

    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),

    // Category lives on the product, not the line item, so this has to look it
    // up. Products deleted since the order was placed fall out — which is the
    // honest answer, since there's nothing left to attribute them to.
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
          pipeline: [{ $project: { category: 1 } }],
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]),

    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $match: { 'items.vendor': { $ne: null } } },
      {
        $group: {
          _id: '$items.vendor',
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
          orders: { $addToSet: '$_id' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor',
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1, 'vendorInfo.businessName': 1 } }],
        },
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
    ]),

    Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $ne: ['$isActive', false] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock.qty', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [{ $and: [{ $gt: ['$stock.qty', 0] }, { $lte: ['$stock.qty', 3] }] }, 1, 0],
            },
          },
          stockValue: { $sum: { $multiply: ['$stock.qty', { $ifNull: ['$price', 0] }] } },
        },
      },
    ]),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    range: {
      key: window.key,
      label: window.label,
      from: window.from,
      to: window.to,
      granularity: window.granularity,
      comparable: Boolean(window.previous),
    },
    totals,
    change: previous
      ? {
          revenue: percentChange(totals.revenue, previous.revenue),
          orders: percentChange(totals.orders, previous.orders),
          units: percentChange(totals.units, previous.units),
          averageOrderValue: percentChange(totals.averageOrderValue, previous.averageOrderValue),
          customers: percentChange(totals.customers, previous.customers),
          newCustomers: percentChange(totals.newCustomers, previous.newCustomers),
        }
      : null,
    series: fillSeries(seriesRows, window),
    statusBreakdown: statusRows.map((row) => ({
      status: row._id || 'unknown',
      count: row.count,
      value: Math.round(row.value || 0),
    })),
    paymentBreakdown: paymentRows.map((row) => ({
      method: row._id.method || 'unknown',
      status: row._id.status || 'unknown',
      count: row.count,
      value: Math.round(row.value || 0),
    })),
    topProducts: topProducts.map((row) => ({
      _id: row._id,
      name: row.name,
      units: row.units,
      revenue: Math.round(row.revenue || 0),
    })),
    topCategories: topCategories.map((row) => ({
      category: row._id || 'uncategorised',
      units: row.units,
      revenue: Math.round(row.revenue || 0),
    })),
    topVendors: topVendors.map((row) => ({
      _id: row._id,
      name:
        row.vendor?.vendorInfo?.businessName ||
        [row.vendor?.firstName, row.vendor?.lastName].filter(Boolean).join(' ') ||
        row.vendor?.email ||
        'Unknown vendor',
      units: row.units,
      orders: row.orders?.length || 0,
      revenue: Math.round(row.revenue || 0),
    })),
    catalogue: {
      products: catalogue[0]?.total || 0,
      active: catalogue[0]?.active || 0,
      outOfStock: catalogue[0]?.outOfStock || 0,
      lowStock: catalogue[0]?.lowStock || 0,
      stockValue: Math.round(catalogue[0]?.stockValue || 0),
    },
  });
};

// ---------------------------------------------------------------------------
// Vendor
// ---------------------------------------------------------------------------

const vendorTotals = async (vendorId, window) => {
  const [row] = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: window.from, $lte: window.to },
        status: { $nin: EXCLUDED_STATUSES },
        'items.vendor': vendorId,
      },
    },
    { $unwind: '$items' },
    { $match: { 'items.vendor': vendorId } },
    {
      $group: {
        _id: null,
        revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
        units: { $sum: '$items.quantity' },
        orders: { $addToSet: '$_id' },
        customers: { $addToSet: '$user' },
      },
    },
  ]);

  const revenue = Math.round(row?.revenue || 0);
  const orders = row?.orders?.length || 0;

  return {
    revenue,
    orders,
    units: row?.units || 0,
    averageOrderValue: orders ? Math.round(revenue / orders) : 0,
    customers: row?.customers?.filter(Boolean).length || 0,
  };
};

/** GET /api/v1/analytics/vendor/:vendorId */
export const getVendorAnalytics = async (req, res) => {
  const requested = req.params.vendorId;
  if (!mongoose.isValidObjectId(requested)) {
    throw new BadRequestError('Not a valid vendor id.');
  }

  // A vendor sees their own figures; an admin can look at any. Without this
  // check the id is just a parameter, and one vendor could read a competitor's
  // revenue by editing the URL.
  const callerId = req.user.id || req.user._id?.toString();
  if (req.user.role !== 'admin' && callerId !== requested) {
    throw new BadRequestError('You can only view your own analytics.');
  }

  const vendorId = new mongoose.Types.ObjectId(requested);
  const scope = { 'items.vendor': vendorId };
  const window = await resolveRange(req.query.range, scope);

  const match = {
    createdAt: { $gte: window.from, $lte: window.to },
    status: { $nin: EXCLUDED_STATUSES },
    ...scope,
  };

  const [totals, previous, seriesRows, statusRows, topProducts, categoryRows, stock, ratings] =
    await Promise.all([
      vendorTotals(vendorId, window),
      window.previous
        ? vendorTotals(vendorId, { from: window.previous.from, to: window.previous.to })
        : null,

      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendorId } },
        {
          $group: {
            _id: bucketExpr(window.granularity),
            revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
            units: { $sum: '$items.quantity' },
            orderIds: { $addToSet: '$_id' },
          },
        },
        { $addFields: { orders: { $size: '$orderIds' } } },
      ]),

      // Where a vendor's own work sits in the pipeline — how many of their
      // orders are waiting to be packed is the number they act on.
      Order.aggregate([
        { $match: { createdAt: { $gte: window.from, $lte: window.to }, ...scope } },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendorId } },
        {
          $group: {
            _id: { order: '$_id', status: '$status' },
            value: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
          },
        },
        { $group: { _id: '$_id.status', count: { $sum: 1 }, value: { $sum: '$value' } } },
        { $sort: { count: -1 } },
      ]),

      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendorId } },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),

      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $match: { 'items.vendor': vendorId } },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'product',
            pipeline: [{ $project: { category: 1 } }],
          },
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            units: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price.amount', '$items.quantity'] } },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // Not windowed: stock is a fact about right now, and "how many of my
      // products were low three weeks ago" is not a thing anyone acts on.
      Product.find({ vendor: vendorId, isActive: { $ne: false }, 'stock.qty': { $lte: 5 } })
        .select('name slug thumbnail stock price')
        .sort({ 'stock.qty': 1 })
        .limit(10)
        .lean(),

      Product.aggregate([
        { $match: { vendor: vendorId, 'rating.count': { $gt: 0 } } },
        {
          $group: {
            _id: null,
            // Weighted by review count, so one five-star review on a new
            // product doesn't outrank two hundred on a bestseller.
            weighted: { $sum: { $multiply: ['$rating.average', '$rating.count'] } },
            reviews: { $sum: '$rating.count' },
            rated: { $sum: 1 },
          },
        },
      ]),
    ]);

  const catalogueCount = await Product.countDocuments({ vendor: vendorId });

  res.status(StatusCodes.OK).json({
    success: true,
    range: {
      key: window.key,
      label: window.label,
      from: window.from,
      to: window.to,
      granularity: window.granularity,
      comparable: Boolean(window.previous),
    },
    totals,
    change: previous
      ? {
          revenue: percentChange(totals.revenue, previous.revenue),
          orders: percentChange(totals.orders, previous.orders),
          units: percentChange(totals.units, previous.units),
          averageOrderValue: percentChange(totals.averageOrderValue, previous.averageOrderValue),
          customers: percentChange(totals.customers, previous.customers),
        }
      : null,
    series: fillSeries(
      seriesRows.map(({ _id, revenue, units, orders }) => ({ _id, revenue, units, orders })),
      window,
    ),
    statusBreakdown: statusRows.map((row) => ({
      status: row._id || 'unknown',
      count: row.count,
      value: Math.round(row.value || 0),
    })),
    topProducts: topProducts.map((row) => ({
      _id: row._id,
      name: row.name,
      units: row.units,
      revenue: Math.round(row.revenue || 0),
    })),
    topCategories: categoryRows.map((row) => ({
      category: row._id || 'uncategorised',
      units: row.units,
      revenue: Math.round(row.revenue || 0),
    })),
    lowStock: stock.map((product) => ({
      _id: product._id,
      name: product.name,
      thumbnail: product.thumbnail,
      qty: product.stock?.qty ?? 0,
      price: product.price,
    })),
    reputation: {
      products: catalogueCount,
      rated: ratings[0]?.rated || 0,
      reviews: ratings[0]?.reviews || 0,
      average: ratings[0]?.reviews
        ? Math.round((ratings[0].weighted / ratings[0].reviews) * 10) / 10
        : null,
    },
  });
};
