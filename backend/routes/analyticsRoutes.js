import express from 'express';

import { getAdminAnalytics, getVendorAnalytics } from '../controllers/analyticsController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/admin', authenticate, authorizeRoles('admin'), getAdminAnalytics);

// The controller checks the caller owns this id (or is an admin) — the route
// can't, since a vendor reading another vendor's id is still a vendor.
router.get('/vendor/:vendorId', authenticate, authorizeRoles('vendor', 'admin'), getVendorAnalytics);

export default router;
