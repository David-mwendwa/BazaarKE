import Order from '../models/Order.js';
import Product from '../models/Product.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from '../utils/customErrors.js';
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
      items: (req.body.items || []).map((item) => ({
        ...item,
        price: {
          amount: item.price?.amount || 0,
          currency: item.price?.currency || 'KES',
        },
      })),
      total: req.body.total || {
        amount:
          req.body.items?.reduce(
            (sum, item) =>
              sum + (item.price?.amount || 0) * (item.quantity || 1),
            0,
          ) || 0,
        currency: 'KES',
      },
      subtotal: req.body.subtotal || {
        amount:
          req.body.items?.reduce(
            (sum, item) =>
              sum + (item.price?.amount || 0) * (item.quantity || 1),
            0,
          ) || 0,
        currency: 'KES',
      },
      shipping: req.body.shipping || {
        amount: 0,
        currency: 'KES',
      },
      tax: {
        amount: req.body.tax?.amount || req.body.payment?.amount?.tax || 0,
        currency:
          req.body.tax?.currency || req.body.payment?.amount?.currency || 'KES',
        rate:
          req.body.tax?.rate ||
          (req.body.payment?.amount?.tax
            ? Math.round(
                (req.body.payment.amount.tax /
                  (req.body.subtotal ||
                    req.body.payment?.amount?.subtotal ||
                    1)) *
                  10000,
              ) / 100
            : 0),
      },
    };

    // Log the order data for debugging
    console.log(
      'Creating order with data:',
      JSON.stringify(orderData, null, 2),
    );

    // Create and save the order
    const order = new Order(orderData);
    await order.save();

    // Populate the user field in the response
    await order.populate('user', 'name email');

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
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email',
  );

  if (!order) {
    throw new NotFoundError(`No order found with ID: ${req.params.id}`);
  }

  // Check if user is authorized to view this oßder
  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
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

    // Find all orders where at least one item belongs to this vendor
    const orders = await Order.find({
      'items.vendor': vendorId,
    })
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort('-createdAt');

    res.status(StatusCodes.OK).json({
      success: true,
      count: orders.length,
      data: orders,
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
    .populate('user', 'name email')
    .sort(sort || '-createdAt')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Order.countDocuments(query);
  const totalAmount = await Order.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    count: orders.length,
    total,
    totalAmount: totalAmount[0]?.total || 0,
    data: orders,
  });
};

// Update order status => PATCH /api/v1/orders/:id
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new BadRequestError('Please provide a status');
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new NotFoundError(`No order found with ID: ${req.params.id}`);
  }

  // Update stock if order is being marked as delivered
  if (status === 'delivered' && order.status !== 'delivered') {
    await updateOrderStock(order.orderItems);
  }

  order.status = status;
  order.updatedAt = Date.now();

  if (status === 'delivered') {
    order.deliveredAt = Date.now();
  } else if (status === 'cancelled') {
    order.cancelledAt = Date.now();
  }

  await order.save();

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

  // Check if order can be cancelled
  if (!['pending', 'processing'].includes(order.status)) {
    throw new BadRequestError(
      `Cannot cancel order with status: ${order.status}`,
    );
  }

  order.status = 'cancelled';
  order.cancelledAt = Date.now();
  order.cancelledBy = req.user.id;
  order.cancellationReason = req.body.reason;

  await order.save();

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
  }).populate('user', 'name email');

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

// Helper function to update product stock
const updateOrderStock = async (orderItems) => {
  for (const item of orderItems) {
    await updateStock(item.product, item.quantity);
  }
};

// Helper function to update product stock
const updateStock = async (productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) return;

  product.stock = Math.max(0, product.stock - quantity);
  await product.save({ validateBeforeSave: false });
};
