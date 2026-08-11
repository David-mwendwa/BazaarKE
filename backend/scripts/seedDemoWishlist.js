import 'dotenv/config';
import mongoose from 'mongoose';

import Product from '../models/Product.js';
import User from '../models/User.js';

/**
 * A few saved products for the demo customer, so `/account/wishlist` shows
 * what the page is for instead of its empty state.
 *
 *   npm run seed:demo-wishlist
 *
 * Picked across categories, and one of them deliberately low on stock, so the
 * card's "Only N left" line and the page's "add the in-stock ones" button both
 * have something to act on.
 *
 * Idempotent: a customer who already has a wishlist is left alone.
 */
const EMAIL = 'demo.customer@bazaarke.dev';
const HOW_MANY = 6;

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bazaarke';
  await mongoose.connect(uri);

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.error(`No ${EMAIL} — run \`npm run seed:demo-users\` first.`);
    process.exit(1);
  }

  if (user.wishlist?.length > 0) {
    console.log(`${EMAIL} already has ${user.wishlist.length} saved products — leaving them.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // One per category, favouring products that carry reviews so the cards show
  // their stars.
  const categories = ['smartphones', 'gaming', 'computing', 'tablets', 'accessories'];
  const picks = [];

  for (const category of categories) {
    // Reviewed if possible, but any product in the category rather than
    // skipping it — only 120 products carry reviews and they aren't spread
    // evenly across the five categories, so insisting on one left the demo
    // wishlist with two items in it.
    const product =
      (await Product.findOne({ category, isActive: true, 'rating.count': { $gt: 0 } })
        .select('_id name')
        .lean()) ||
      (await Product.findOne({ category, isActive: true, 'stock.qty': { $gt: 0 } })
        .select('_id name')
        .lean());

    if (product) picks.push(product);
  }

  // Plus something nearly sold out, for the low-stock line.
  const scarce = await Product.findOne({
    isActive: true,
    'stock.qty': { $gt: 0, $lte: 3 },
    _id: { $nin: picks.map((p) => p._id) },
  })
    .select('_id name')
    .lean();

  if (scarce) picks.push(scarce);

  user.wishlist = picks.slice(0, HOW_MANY).map((p) => p._id);
  await user.save({ validateModifiedOnly: true });

  console.log(`Saved ${user.wishlist.length} products to ${EMAIL}'s wishlist:`);
  picks.slice(0, HOW_MANY).forEach((p) => console.log(`  · ${p.name}`));

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
