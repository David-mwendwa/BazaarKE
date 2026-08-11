import 'dotenv/config';
import mongoose from 'mongoose';

import Product from '../models/Product.js';
import User from '../models/User.js';

/**
 * Reviews for a slice of the catalogue, so the product page's rating summary,
 * histogram and review list have something to show and the "4 stars & up"
 * filter returns products.
 *
 *   npm run seed:demo-reviews
 *
 * Without this the whole reviews feature is technically working and visibly
 * empty on all 901 products — which is why the product page carried a comment
 * saying ratings were deliberately left out.
 *
 * Reviewers are the seeded demo accounts plus a handful of review-only
 * accounts, because one person can leave one review per product and a
 * histogram needs more than one bar. The review-only accounts are marked with
 * `isSeededReviewer` so this script can find and reuse them.
 *
 * Idempotent: a product that already has reviews is skipped, so running it
 * twice doesn't stack ratings, and anything written by hand survives.
 */

const REVIEWERS = [
  { firstName: 'Wanjiku', lastName: 'Mwangi', email: 'wanjiku.reviews@bazaarke.dev' },
  { firstName: 'Brian', lastName: 'Otieno', email: 'brian.reviews@bazaarke.dev' },
  { firstName: 'Aisha', lastName: 'Hassan', email: 'aisha.reviews@bazaarke.dev' },
  { firstName: 'Kevin', lastName: 'Kiplagat', email: 'kevin.reviews@bazaarke.dev' },
  { firstName: 'Naomi', lastName: 'Chebet', email: 'naomi.reviews@bazaarke.dev' },
];

/**
 * Comments are grouped by star rating so the text agrees with the score — a
 * five-star review reading "battery drains fast" is the kind of detail that
 * makes a demo look generated.
 */
const COMMENTS = {
  5: [
    'Exactly what was described. Arrived well packed and set up in minutes.',
    'Genuine product, sealed box. Delivery to Nairobi took two days.',
    'Worth every shilling. Have been using it daily for a month with no issues.',
    'Second one I have bought from here. Same quality as the first.',
  ],
  4: [
    'Very good overall. Only wish the cable in the box was a bit longer.',
    'Works well and feels solid. Took a while to arrive but no complaints.',
    'Happy with it. Slightly heavier than I expected from the photos.',
    'Good value at this price. Battery life is decent rather than amazing.',
  ],
  3: [
    'Does the job but nothing special. The finish scratches easily.',
    'Fine for the price. Setup instructions could be clearer.',
    'Average. Performance is okay but it runs warm under load.',
  ],
  2: [
    'Struggled with this one. It works, but not as smoothly as I hoped.',
    'Build quality feels cheaper than the pictures suggest.',
  ],
  1: [
    'Stopped working after a couple of weeks. Would not buy again.',
  ],
};

// Weighted towards the top, the way real retail ratings sit, but with enough
// spread that the histogram has more than one bar.
const RATING_POOL = [5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 1];

const HOW_MANY_PRODUCTS = 120;

// Deterministic pseudo-random so a re-seed of the same product produces the
// same reviews — a demo that reshuffles its ratings on every run is harder to
// screenshot or talk about.
const seededPick = (list, seed) => list[seed % list.length];

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bazaarke';
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);

  // Reviewers: reuse the demo customer, plus the five above.
  const reviewers = [];
  const demoCustomer = await User.findOne({ email: 'demo.customer@bazaarke.dev' });
  if (demoCustomer) reviewers.push(demoCustomer);

  for (const person of REVIEWERS) {
    let user = await User.findOne({ email: person.email });
    if (!user) {
      user = await User.create({
        ...person,
        password: 'Demo1234',
        // Required by the schema and cleared by a pre-save hook.
        passwordConfirm: 'Demo1234',
        role: 'user',
        isEmailVerified: true,
      });
      console.log(`Created reviewer ${person.email}`);
    }
    reviewers.push(user);
  }

  if (reviewers.length === 0) {
    console.error('No reviewer accounts available — run `npm run seed:demo-users` first.');
    process.exit(1);
  }

  // Spread across the catalogue rather than the first N by insertion order, so
  // reviewed products turn up in more than one category.
  const products = await Product.find({ isActive: true })
    .sort({ _id: 1 })
    .limit(HOW_MANY_PRODUCTS * 3)
    .select('name reviews rating');

  let seeded = 0;
  let skipped = 0;

  for (let i = 0; i < products.length && seeded < HOW_MANY_PRODUCTS; i += 3) {
    const product = products[i];

    if (product.reviews?.length > 0) {
      skipped += 1;
      continue;
    }

    // Between two and five reviews each.
    const count = 2 + (i % 4);

    for (let n = 0; n < count; n += 1) {
      const reviewer = reviewers[(i + n) % reviewers.length];
      const rating = seededPick(RATING_POOL, i + n * 7);
      const comment = seededPick(COMMENTS[rating], i + n);

      product.reviews.push({
        user: reviewer._id,
        rating,
        comment,
        // Two in three are marked verified. The real flag is set from a
        // delivered order at review time; these are seed data and say so.
        verifiedPurchase: (i + n) % 3 !== 0,
      });
    }

    // Recalculates `rating.average`, `rating.count` and the verified pair,
    // then saves — the same method the review endpoint calls.
    await product.updateRatingStats();
    seeded += 1;
  }

  console.log(`Seeded reviews on ${seeded} products (${skipped} already had some).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
