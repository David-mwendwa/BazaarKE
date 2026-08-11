import 'dotenv/config';
import mongoose from 'mongoose';

import Coupon from '../models/Coupon.js';

/**
 * Three demo promo codes, so the checkout's code box has something to accept
 * before anyone has visited the admin screen. Idempotent — existing codes are
 * left exactly as they are, including their `usedCount`.
 *
 *   npm run seed:coupons
 */
const COUPONS = [
  {
    code: 'WELCOME10',
    description: '10% off your order, up to Ksh 5,000',
    type: 'percent',
    value: 10,
    maxDiscount: 5000,
    isPublic: true,
  },
  {
    code: 'SAVE2K',
    description: 'Ksh 2,000 off orders over Ksh 20,000',
    type: 'fixed',
    value: 2000,
    minSpend: 20000,
    isPublic: true,
  },
  {
    code: 'BAZAAR5',
    description: '5% off, first 50 orders',
    type: 'percent',
    value: 5,
    usageLimit: 50,
    // Left unlisted, to exercise the other half of the flag: a code that
    // works when typed but is never advertised.
    isPublic: false,
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bazaarke');

  for (const coupon of COUPONS) {
    const existing = await Coupon.findOne({ code: coupon.code });
    if (existing) {
      console.log(`· ${coupon.code} already exists — left alone`);
      continue;
    }
    await Coupon.create(coupon);
    console.log(`✓ ${coupon.code} created`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
