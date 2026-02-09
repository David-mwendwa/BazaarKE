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
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/orders/tracking/:trackingNumber', getOrderByTrackingNumber);

// Protected routes
router.use(authenticate);

// Order routes
router
  .route('/orders')
  .post(newOrder)
  .get(authorizeRoles('admin'), getAllOrders);

router.route('/users/:userId/orders').get(getUserOrders);

// Vendor orders route
router.get('/orders/vendor/:vendorId', getVendorOrders);

router
  .route('/orders/:id')
  .get(getSingleOrder)
  .patch(updateOrderStatus)
  .delete(authorizeRoles('admin'), deleteOrder);

router.post('/orders/:id/cancel', cancelOrder);

export default router;
