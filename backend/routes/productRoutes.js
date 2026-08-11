import express from 'express';
import {
  getProducts,
  getProductFacets,
  newProduct,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getProductReviews,
  deleteReview,
  getAdminProducts,
  getVendorProducts,
} from '../controllers/productController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.route('/products').get(getProducts);
router.route('/products/facets').get(getProductFacets);
router.route('/product/:id').get(getSingleProduct);
router
  .route('/admin/product/new')
  .post(authenticate, authorizeRoles('admin'), newProduct);
router
  .route('/admin/products')
  .get(authenticate, authorizeRoles('admin'), getAdminProducts);
router
  .route('/admin/product/:id')
  .patch(authenticate, authorizeRoles('admin'), updateProduct)
  .delete(authenticate, authorizeRoles('admin'), deleteProduct);

// Vendor product management — a vendor manages only their own catalog.
// Ownership itself is enforced in the controllers (assertOwnsProduct), not
// here, so admins can reuse the same handlers for their own broader access.
router
  .route('/vendor/products')
  .get(authenticate, authorizeRoles('vendor', 'admin'), getVendorProducts)
  .post(authenticate, authorizeRoles('vendor', 'admin'), newProduct);
router
  .route('/vendor/products/:id')
  .patch(authenticate, authorizeRoles('vendor', 'admin'), updateProduct)
  .delete(authenticate, authorizeRoles('vendor', 'admin'), deleteProduct);

// Reviews hang off the product they belong to, rather than the old top-level
// `/review` and `/reviews?id=` pair that took the product id from a query
// string. Listing is public — a shopper reads reviews before signing in, if
// they ever sign in at all.
router
  .route('/products/:id/reviews')
  .get(getProductReviews)
  .post(authenticate, createProductReview);
router.delete('/products/:id/reviews/:reviewId', authenticate, deleteReview);

export default router;
