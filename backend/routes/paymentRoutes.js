import express from 'express';
import {
  processCardPayment,
  processMpesaPayment,
  processPayPalPayment,
  mpesaCallback,
  checkPaymentStatus,
  getPaymentMethods,
  getPaymentConfig,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import mpesaAuth from '../middleware/mpesaAuth.js';

const router = express.Router();

// Payment methods and config
router.route('/methods').get(getPaymentMethods);
router.route('/config').get(getPaymentConfig);

// Payment processing endpoints
router.route('/card').post(authenticate, processCardPayment);
router.route('/mpesa').post(authenticate, mpesaAuth, processMpesaPayment);
router.route('/paypal').post(authenticate, processPayPalPayment);

// M-Pesa webhook
router.route('/mpesa/callback').post(mpesaAuth, mpesaCallback);

// Payment status
router.route('/status/:orderId').get(authenticate, checkPaymentStatus);

export default router;
