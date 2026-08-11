import express from 'express';

import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from '../controllers/categoryController.js';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Reading is public — the storefront's nav, its filter sidebar and its home
 * page all need this list before anyone signs in.
 *
 * `optionalAuthenticate` rather than nothing: the same endpoint serves the
 * admin table, which asks for inactive rows and the orphan-slug report. The
 * controller grants those on `req.user.role === 'admin'` and ignores the
 * query parameter for everyone else, so an anonymous caller can't widen it.
 */
router
  .route('/')
  .get(optionalAuthenticate, getCategories)
  .post(authenticate, authorizeRoles('admin'), createCategory);

/**
 * One parameter name across all three verbs, because Express passes whatever
 * the route declares and the controllers read `req.params.id` — naming this
 * `:slug` for the GET alone made every PATCH and DELETE look up `undefined`
 * and 404 on a category that was right there.
 *
 * GET accepts either an id or a slug (the storefront has the slug, the admin
 * table has the id). PATCH and DELETE take the id only: a slug is a moving
 * target here, since changing it is one of the things PATCH does.
 */
router
  .route('/:id')
  .get(getCategory)
  .patch(authenticate, authorizeRoles('admin'), updateCategory)
  .delete(authenticate, authorizeRoles('admin'), deleteCategory);

export default router;
