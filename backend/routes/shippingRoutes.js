import express from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  SHIPPING_ZONES,
  SHIPPING_CURRENCY,
  FREE_SHIPPING_ABOVE,
  calculateShipping,
} from '../utils/shipping.js';

const router = express.Router();

// GET /api/v1/shipping/rates — the table the checkout quotes from. Served
// rather than duplicated in the frontend so the quote and the charge can't
// drift apart.
router.get('/rates', (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    currency: SHIPPING_CURRENCY,
    freeAbove: FREE_SHIPPING_ABOVE,
    zones: SHIPPING_ZONES,
  });
});

// GET /api/v1/shipping/quote?city=Nairobi&subtotal=12400
router.get('/quote', (req, res) => {
  const quote = calculateShipping({
    city: req.query.city,
    subtotal: Number(req.query.subtotal) || 0,
  });
  res.status(StatusCodes.OK).json({ success: true, ...quote });
});

export default router;
