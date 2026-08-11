import express from 'express';

import {
  validateCoupon,
  getPublicCoupons,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Quoting a code is open to anyone with a basket — the checkout calls it
// before an account is necessarily involved. Redeeming still happens
// server-side in `newOrder`, which re-validates.
router.post('/validate', validateCoupon);

// Advertised codes. Public by necessity — the cart shows these before anyone
// signs in — which is why `isPublic` has to be opted into per coupon.
router.get('/public', getPublicCoupons);

router
  .route('/')
  .get(authenticate, authorizeRoles('admin'), getCoupons)
  .post(authenticate, authorizeRoles('admin'), createCoupon);

router
  .route('/:id')
  .patch(authenticate, authorizeRoles('admin'), updateCoupon)
  .delete(authenticate, authorizeRoles('admin'), deleteCoupon);

export default router;
