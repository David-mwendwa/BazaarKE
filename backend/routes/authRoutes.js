import express from 'express';
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updatePassword,
  updateProfile,
  logout,
  allUsers,
  getUserDetails,
  updateUser,
  deleteUser,
} from '../controllers/authController.js';

import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/addressController.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/me').get(authenticate, getUserProfile);
router.route('/logout').get(logout);
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').patch(resetPassword);
router.route('/password/update').patch(authenticate, updatePassword);
router.route('/me/update').patch(authenticate, updateProfile);

// Address book. Mounted here rather than on its own router because these are
// `/me/*` routes — the same authenticated-user prefix the profile uses.
router
  .route('/me/addresses')
  .get(authenticate, getAddresses)
  .post(authenticate, createAddress);
router
  .route('/me/addresses/:addressId')
  .patch(authenticate, updateAddress)
  .delete(authenticate, deleteAddress);
router.patch('/me/addresses/:addressId/default', authenticate, setDefaultAddress);

// Saved products. Alongside the address book under `/me` — both are things
// the account owns, and neither is ever read for anyone but the caller.
router
  .route('/me/wishlist')
  .get(authenticate, getWishlist)
  .post(authenticate, addToWishlist);
router.delete('/me/wishlist/:productId', authenticate, removeFromWishlist);
router
  .route('/admin/users')
  .get(authenticate, authorizeRoles('admin'), allUsers);
router
  .route('/admin/user/:id')
  .get(authenticate, authorizeRoles('admin'), getUserDetails)
  .patch(authenticate, authorizeRoles('admin'), updateUser)
  .delete(authenticate, authorizeRoles('admin'), deleteUser);

export default router;
