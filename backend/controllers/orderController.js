import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { applyCoupon } from './couponController.js';
import { calculateShipping } from '../utils/shipping.js';
import { releaseStock, reserveStock } from '../utils/inventory.js';
import { sendTemplate } from '../utils/mailer.js';
import { orderPlaced } from '../utils/emailTemplates.js';

/**
 * Who pays for a promo code. `'platform'` means the shop absorbs it and
 * vendors are paid the full price of their line items; `'vendor'` would mean
 * each seller carries a pro-rata share. See `getVendorOrders`, which is the
 * only place this is acted on.
 */
const DISCOUNT_FUNDING = 'platform';
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from '../errors/customErrors.js';
import { StatusCodes } from 'http-status-codes';

// Create a new order => POST /api/v1/orders
export const newOrder = async (req, res) => {
  try {
    // Get payment method from request body or default to 'cash_on_delivery'
    const paymentMethod =
      req.body.payment?.method || req.body.paymentMethod || 'cash_on_delivery';

    // Ensure payment method is valid
    const validPaymentMethods = [
      'card',
      'paypal',
      'mpesa',
      'cash_on_delivery',
      'bank_transfer',
    ];
    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new BadRequestError(
        `Invalid payment method. Must be one of: ${validPaymentMethods.join(
          ', ',
        )}`,
      );
    }

    // Log the user object for debugging
    console.log('User from token:', req.user);

    // Ensure we have a valid user ID from the token
    if (!req.user || !req.user.id) {
      console.error('No user ID found in request');
      throw new UnauthenticatedError('User not authenticated');
    }

    // Resolve each line item's vendor from the product itself rather than
    // trusting the client — this is what scopes a vendor's order list, so it
    // must not be spoofable from the request body.
    const requestedItems = req.body.items || [];
    const productsById = new Map(
      (
        await Product.find({
          _id: { $in: requestedItems.map((i) => i.product).filter(Boolean) },
        })
          .select('vendor name price specialPrice thumbnail')
          .lean()
      ).map((p) => [p._id.toString(), p]),
    );

    // Line items are rebuilt from the database — name, price and vendor — with
    // only the quantity taken from the request. The client used to supply the
    // price it wanted charged, and the totals below were likewise read from
    // the body, so a hand-rolled POST could buy the catalogue for a shilling.
    const orderItems = requestedItems.map((item) => {
      const product = productsById.get(String(item.product));
      if (!product) {
        throw new BadRequestError('One of the products in your cart no longer exists');
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = product.specialPrice || product.price || 0;

      return {
        product: product._id,
        vendor: product.vendor,
        name: product.name,
        quantity,
        thumbnail: product.thumbnail,
        price: { amount: unitPrice, currency: 'KES' },
      };
    });

    if (orderItems.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price.amount * item.quantity,
      0,
    );

    // Re-quoted here, not trusted from the body: a code can expire or hit its
    // usage cap between the checkout's preview and this request.
    let discountRecord = { amount: 0, currency: 'KES', code: undefined };
    let redeemedCoupon = null;
    if (req.body.couponCode) {
      const { coupon, discount } = await applyCoupon(req.body.couponCode, subtotal);
      discountRecord = { amount: discount, currency: 'KES', code: coupon.code };
      redeemedCoupon = coupon;
    }

    const shippingQuote = calculateShipping({
      city: req.body.shippingAddress?.city,
      subtotal: subtotal - discountRecord.amount,
    });

    const total = subtotal - discountRecord.amount + shippingQuote.amount;

    // Create the order with the request body and user ID
    const orderData = {
      ...req.body,
      user: req.user.id, // Use req.user.id instead of req.user._id
      status: 'pending',
      payment: {
        ...(req.body.payment || {}),
        method: paymentMethod,
        status: 'pending',
        provider: (() => {
          switch (paymentMethod) {
            case 'mpesa':
              return 'mpesa';
            case 'card':
              return 'stripe';
            case 'paypal':
              return 'paypal';
            case 'bank_transfer':
              return 'manual';
            case 'cash_on_delivery':
              return 'manual';
            default:
              return 'manual';
          }
        })(),
      },
      // Set default values for required fields if not provided
      orderNumber: 'TEMP-' + Date.now(), // Will be replaced by pre-save hook
      items: orderItems,
      subtotal: { amount: subtotal, currency: 'KES' },
      shipping: { ...shippingQuote, currency: 'KES' },
      discount: discountRecord,
      total: { amount: total, currency: 'KES' },
      // Prices in this catalogue are Kenyan retail figures, quoted
      // VAT-inclusive, so there is no tax to add on top. The field stays at
      // zero rather than being dropped — the schema has it, and an order that
      // one day carries a VAT-exclusive line needs somewhere to put it.
      tax: { amount: 0, currency: 'KES', rate: 0 },
    };

    // Log the order data for debugging
    console.log(
      'Creating order with data:',
      JSON.stringify(orderData, null, 2),
    );

    // Stock comes off the shelf here, before the order is written, so two
    // shoppers can't both buy the last unit. If any line is short this throws
    // a BadRequestError naming it and nothing has been committed.
    await reserveStock(orderItems);

    // Create and save the order
    const order = new Order(orderData);
    try {
      await order.save();
    } catch (saveError) {
      // The reservation is only justified by an order that exists.
      await releaseStock(orderItems);
      throw saveError;
    }

    // Counted only once the order exists, so a failed save can't burn a
    // single-use code. `$inc` rather than a read-modify-write: two shoppers
    // redeeming the last use at the same moment would otherwise both read the
    // same count and both save it as one higher.
    if (redeemedCoupon) {
      await Coupon.updateOne({ _id: redeemedCoupon._id }, { $inc: { usedCount: 1 } });
    }

    // Populate the user field in the response
    await order.populate('user', 'firstName lastName email');

    // Confirmation email. Deliberately after the order is committed and the
    // coupon counted, and deliberately not awaited into the response: an
    // order that exists must be reported as created whatever the mail server
    // does. `sendTemplate` resolves rather than throwing, so there is no
    // rejection to leak here.
    const recipient = order.customer?.email || order.user?.email;
    if (recipient) {
      sendTemplate(recipient, orderPlaced({ order }));
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error creating order:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: 'Validation Error',
        message: messages.join(', '),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }

    // Typed errors carry their own status — an expired promo code or a
    // deleted product is the client's problem, not a server fault. Without
    // this the local catch turned every `BadRequestError` thrown above into a
    // 500 with the message buried in an `error` field the frontend doesn't
    // read.
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    // Handle other errors
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error creating order',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// Get single order => GET /api/v1/orders/:id
export const getSingleOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email')
    .populate('items.product', 'name price vendor thumbnail images');

  if (!order) {
    throw new NotFoundError(`No order found with ID: ${req.params.id}`);
  }

  const userId = req.user.id || req.user._id?.toString();
  const isOrderOwner = order.user?._id?.toString() === userId;
  const isAdmin = req.user.role === 'admin';
  const isVendor =
    req.user.role === 'vendor' &&
    order.items?.some((item) => {
      const vendorId =
        item.vendor?.toString?.() || item.product?.vendor?.toString?.();
      return vendorId === userId;
    });

  if (!isOrderOwner && !isAdmin && !isVendor) {
    throw new UnauthenticatedError('Not authorized to access this order');
  }

  res.status(StatusCodes.OK).json({ success: true, data: order });
};

// Get orders for a vendor => GET /api/v1/orders/vendor/:vendorId
export const getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    if (!vendorId) {
      throw new BadRequestError('Vendor ID is required');
    }

    // A vendor may only ever list their own orders; only an admin may look
    // up another vendor's.
    const userId = req.user.id || req.user._id?.toString();
    if (req.user.role !== 'admin' && vendorId !== userId) {
      throw new UnauthenticatedError("Not authorized to access this vendor's orders");
    }

    // Find all orders where at least one item belongs to this vendor
    const orders = await Order.find({
      'items.vendor': vendorId,
    })
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name price')
      .sort('-createdAt')
      .lean();

    // Strip other vendors' line items before responding — an order can span
    // several sellers, and a vendor has no business seeing a competitor's
    // products or prices. Each order's vendor-scoped subtotal is computed
    // here too, so the client doesn't have to re-derive it.
    const scoped = orders.map((order) => {
      const items = order.items.filter(
        (item) => String(item.vendor) === String(vendorId),
      );
      const currency = order.total?.currency || 'KES';
      const subtotal = items.reduce(
        (sum, item) => sum + (item.price?.amount || 0) * item.quantity,
        0,
      );

      // Promo codes are **platform-funded** (`DISCOUNT_FUNDING`): the shop
      // runs the campaign and absorbs it, so a vendor is owed the full price
      // of their line items whatever the customer actually paid. That's why
      // `vendorSubtotal` is the gross figure and not a pro-rata share.
      //
      // It's stated rather than assumed because the alternative is a real
      // business model too — vendor-funded, where each seller carries their
      // slice of the discount. If that's ever the deal, this is the one place
      // that changes: split `order.discount.amount` in proportion to
      // `subtotal / order.subtotal.amount` and subtract it here.
      const orderDiscount = order.discount?.amount || 0;

      return {
        ...order,
        items,
        vendorSubtotal: { amount: subtotal, currency },
        // What the vendor is paid. Equal to `vendorSubtotal` today; kept as
        // its own field so a dashboard reads the payout rather than inferring
        // one, and so the funding model can change without every caller
        // changing with it.
        vendorPayout: { amount: subtotal, currency, fundedBy: DISCOUNT_FUNDING },
        // Present so the vendor can see why a customer paid less than the
        // line total, instead of finding a mismatch and assuming an error.
        platformDiscount:
          orderDiscount > 0
            ? { amount: orderDiscount, currency, code: order.discount?.code }
            : null,
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      count: scoped.length,
      data: scoped,
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error fetching vendor orders',
    });
  }
};

// Get user's orders => GET /api/v1/users/:userId/orders
export const getUserOrders = async (req, res) => {
  // Check if user is requesting their own orders or is admin
  if (req.params.userId !== req.user.id && req.user.role !== 'admin') {
    throw new UnauthenticatedError('Not authorized to access these orders');
  }

  const { status, sort, limit = 10, page = 1 } = req.query;
  const query = { user: req.params.userId };

  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .sort(sort || '-createdAt')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Order.countDocuments(query);

  res.status(StatusCodes.OK).json({
    success: true,
    count: orders.length,
    total,
    data: orders,
  });
};

// Get all orders - admin => GET /api/v1/orders
export const getAllOrders = async (req, res) => {
  const { status, sort, limit = 25, page = 1 } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('user', 'firstName lastName email')
    .sort(sort || '-createdAt')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Order.countDocuments(query);
  const totalAmount = await Order.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$total.amount' } } },
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    count: orders.length,
    total,
    totalAmount: totalAmount[0]?.total || 0,
    data: orders,
  });
};

/**
 * The states an order can be moved to, and who may move it there.
 *
 * A vendor gets the fulfilment path and nothing else. They can say a parcel
 * has shipped — that's their job — but cancelling and refunding are the
 * shop's calls, and a vendor who could mark an order `refunded` would be
 * writing off money on someone else's behalf.
 */
const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];
const VENDOR_STATUSES = ['processing', 'shipped', 'delivered'];

/**
 * Where an order may go from where it is.
 *
 * Until this existed, `PATCH /orders/:id` took any status from any status, so
 * a **cancelled order could be moved back to processing** — and cancelling has
 * already put the units back on sale and refunded the promo code's usage, so
 * reopening one committed the shop to shipping stock it had given away, with
 * a discount it had handed back. `delivered` → `pending` was reachable the
 * same way.
 *
 * `cancelled` and `refunded` are terminal on purpose: undoing either means
 * re-reserving stock that may since have sold out, which is a decision no
 * status dropdown should be able to make on its own. Place a new order.
 */
const TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  // Matches `cancelOrder`'s own rule — once it's with the courier, stopping it
  // isn't something the shop can do by editing a field.
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/**
 * The side effects of cancelling, in one place.
 *
 * `cancelOrder` (the customer's route) had them and `updateOrderStatus` did
 * not — so an admin picking "cancelled" from the dashboard dropdown closed the
 * order while leaving its stock reserved forever and its single-use promo code
 * spent on a purchase that never happened.
 */
const applyCancellation = (order, { reason, by }) => {
  order.cancelledAt = Date.now();
  order.cancelledBy = by;
  if (reason) order.cancellationReason = reason;
};

const releaseCancelledOrder = async (order) => {
  // After the save, so a failed write can't hand back stock the order still
  // claims.
  await releaseStock(order.items);

  if (order.discount?.code) {
    await Coupon.updateOne(
      { code: order.discount.code, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } }
    );
  }
};

// Update order status => PATCH /api/v1/orders/:id
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new BadRequestError('Please provide a status');
  }
  if (!ORDER_STATUSES.includes(status)) {
    throw new BadRequestError(
      `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}`
    );
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new NotFoundError(`No order found with ID: ${req.params.id}`);
  }

  // Vendors may only advance an order they actually have a line in. The route
  // used to be admin-only, which left vendors with a read-only order list and
  // no way to fulfil anything they'd sold.
  if (req.user.role !== 'admin') {
    const sellsInThisOrder = order.items.some(
      (item) => item.vendor?.toString() === req.user.id
    );

    if (!sellsInThisOrder) {
      throw new UnauthenticatedError('Not authorized to update this order');
    }
    if (!VENDOR_STATUSES.includes(status)) {
      throw new BadRequestError(
        `Vendors can set: ${VENDOR_STATUSES.join(', ')}. Ask an admin for anything else.`
      );
    }
  }

  // Setting the status it already has is a no-op, not an error — two admins
  // on the same order shouldn't produce a failure for agreeing.
  if (order.status === status) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Order is already ${status}`,
      data: order,
    });
  }

  const allowed = TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new BadRequestError(
      allowed.length === 0
        ? `A ${order.status} order is final — its status can't be changed.`
        : `A ${order.status} order can only become: ${allowed.join(', ')}.`
    );
  }

  // Stock is *not* touched on the ordinary steps. It was reserved when the
  // order was placed (see utils/inventory.js); decrementing again on delivery
  // would count the same unit twice. Cancelling is the one status change that
  // moves stock back, and it has to do here exactly what `cancelOrder` does —
  // this path used to skip it entirely.
  const cancelling = status === 'cancelled';
  if (cancelling) {
    applyCancellation(order, { reason: req.body.reason, by: req.user.id });
  }

  order.status = status;
  order.updatedAt = Date.now();
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status, changedBy: req.user.id });

  await order.save();

  if (cancelling) await releaseCancelledOrder(order);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Order status updated',
    data: order,
  });
};

// Cancel order => POST /api/v1/orders/:id/cancel
export const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new NotFoundError(`No order found with ID: ${req.params.id}`);
  }

  // Check if user is authorized to cancel this order
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new UnauthenticatedError('Not authorized to cancel this order');
  }

  // The same rule the TRANSITIONS map states — read from it, so the two can't
  // drift into a cancel the dashboard allows and this route refuses.
  if (!(TRANSITIONS[order.status] ?? []).includes('cancelled')) {
    throw new BadRequestError(
      `Cannot cancel order with status: ${order.status}`,
    );
  }

  applyCancellation(order, { reason: req.body.reason, by: req.user.id });
  order.status = 'cancelled';
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status: 'cancelled', changedBy: req.user.id });

  await order.save();

  // Units back on the shelf, and the promo code un-spent — a single-use code
  // shouldn't be consumed by a purchase that never happened.
  await releaseCancelledOrder(order);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
};

// Get order by tracking number => GET /api/v1/orders/tracking/:trackingNumber
export const getOrderByTrackingNumber = async (req, res) => {
  const order = await Order.findOne({
    trackingNumber: req.params.trackingNumber,
  }).populate('user', 'firstName lastName email');

  if (!order) {
    throw new NotFoundError('No order found with this tracking number');
  }

  // If not admin, verify the order belongs to the user
  if (
    order.user._id.toString() !== req.user?.id &&
    req.user?.role !== 'admin'
  ) {
    throw new UnauthenticatedError('Not authorized to view this order');
  }

  res.status(StatusCodes.OK).json({ success: true, data: order });
};

// Delete order - admin => DELETE /api/v1/orders/:id
export const deleteOrder = async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    throw new NotFoundError(`No order found with ID: ${req.params.id}`);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Order deleted successfully',
  });
};

// The `updateOrderStock` / `updateStock` helpers that used to live here are
// gone. They ran on delivery, read-modify-wrote each product, and clamped at
// zero — which silently absorbed the oversell instead of preventing it.
// `utils/inventory.js` does the same job with a conditional update that can't
// go negative in the first place.
