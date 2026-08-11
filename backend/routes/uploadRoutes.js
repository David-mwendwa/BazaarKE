import express from 'express';
import { uploadCategoryImage, uploadImages } from '../controllers/uploadController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Writing to disk (or someone's Cloudinary quota) is not something an
// anonymous request gets to do.
router
  .route('/uploads/images')
  .post(authenticate, authorizeRoles('vendor', 'admin'), uploadImages);

// Category artwork is admin-only, matching who can edit a category at all.
router
  .route('/uploads/category-image')
  .post(authenticate, authorizeRoles('admin'), uploadCategoryImage);

export default router;
