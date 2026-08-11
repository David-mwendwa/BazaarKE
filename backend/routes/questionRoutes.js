import express from 'express';

import {
  answerQuestion,
  askQuestion,
  deleteQuestion,
  getProductQuestions,
  getVendorQuestions,
  moderateQuestion,
} from '../controllers/questionController.js';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Mounted on the generic '/api/v1' prefix alongside productRoutes, so
 * `authenticate` is applied per route rather than with a path-less
 * `router.use` — see the note in orderRoutes.js for why that matters here.
 *
 * The vendor queue is declared before `/questions/:id` so 'vendor' can't be
 * read as an id.
 */
router.get(
  '/vendor/questions',
  authenticate,
  authorizeRoles('vendor', 'admin'),
  getVendorQuestions,
);

// Public read; `optionalAuthenticate` only so a signed-in reader's own
// question can be marked as theirs.
router
  .route('/products/:id/questions')
  .get(optionalAuthenticate, getProductQuestions)
  .post(authenticate, askQuestion);

router.post('/questions/:id/answers', authenticate, authorizeRoles('vendor', 'admin'), answerQuestion);

router
  .route('/questions/:id')
  .patch(authenticate, authorizeRoles('admin'), moderateQuestion)
  .delete(authenticate, deleteQuestion);

export default router;
