import express from 'express';
import {
  newOrder,
  getSingleOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderByTrackingNumber,
  deleteOrder,
  getVendorOrders,
} from '../controllers/orderController.js';
import {
  listPaymentsForReview,
  reviewPayment,
  submitPaymentReference,
} from '../controllers/paymentReviewController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/orders/tracking/:trackingNumber', getOrderByTrackingNumber);

// Protected routes — authenticate is applied per-route (not via a blanket
// `router.use`) because this router is mounted at the same generic
// '/api/v1' prefix as productRoutes/authRoutes/paymentRoutes; a path-less
// `router.use(authenticate)` here would run for *any* request that falls
// through to this router, including ones meant for routers mounted after it
// (e.g. GET /payments/config), and reject them before they ever get there.
router
  .route('/orders')
  .post(authenticate, newOrder)
  .get(authenticate, authorizeRoles('admin'), getAllOrders);

router.route('/users/:userId/orders').get(authenticate, getUserOrders);

// Vendor orders route
router.get('/orders/vendor/:vendorId', authenticate, getVendorOrders);

router
  .route('/orders/:id')
  .get(authenticate, getSingleOrder)
  // Vendors too — `updateOrderStatus` checks they have a line in the order
  // and limits them to the fulfilment statuses.
  .patch(authenticate, authorizeRoles('admin', 'vendor'), updateOrderStatus)
  .delete(authenticate, authorizeRoles('admin'), deleteOrder);

router.post('/orders/:id/cancel', authenticate, cancelOrder);

// Payment verification. The customer's half is a claim about a transaction;
// the admin's half is the decision that moves `payment.status`. Mounted here
// rather than under /payments because both are scoped to one order and the
// authorization is the order's, not the gateway's.
router.post('/orders/:id/payment/reference', authenticate, submitPaymentReference);
router.patch(
  '/orders/:id/payment/review',
  authenticate,
  authorizeRoles('admin'),
  reviewPayment,
);
router.get(
  '/admin/payments',
  authenticate,
  authorizeRoles('admin'),
  listPaymentsForReview,
);

export default router;
