import 'dotenv/config';
import mongoose from 'mongoose';

import Category from '../models/Category.js';
import Product from '../models/Product.js';

/**
 * Turns the catalogue's existing category slugs into real, editable rows.
 *
 *   npm run seed:categories
 *
 * The taxonomy used to live in two places that couldn't see each other: a
 * hardcoded array in the frontend, and whatever strings the scraped products
 * happened to carry in `Product.category`. This reads the second and writes
 * the first into the database, so the admin screen starts populated with the
 * categories the shop actually stocks rather than an empty table.
 *
 * Descriptions are written here rather than generated, and say only what the
 * category contains — there is no delivery, warranty or returns claim in any
 * of them, because none of those exist behind the copy.
 *
 * No thumbnails: the images would have to be invented, and the storefront
 * already falls back to its icons. Add them from the admin screen.
 *
 * Idempotent — an existing slug is left exactly as it is, including any
 * editing that's been done to it since.
 */
const DESCRIPTIONS = {
  accessories: 'Cables, chargers, cases, audio and the small things that keep everything else running.',
  computing: 'Laptops, desktops, monitors and the components to build or upgrade one.',
  gaming: 'Consoles, controllers, headsets and games.',
  smartphones: 'Phones across every price, from budget handsets to current flagships.',
  tablets: 'Tablets and e-readers, with the keyboards and styluses that go with them.',
  smarthome: 'Lighting, plugs, cameras and speakers that talk to each other.',
};

/** Nav order, most-shopped first. Anything unlisted sorts after these. */
const ORDER = ['smartphones', 'computing', 'gaming', 'tablets', 'accessories', 'smarthome'];

const titleCase = (slug) =>
  slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/bazaarke';
  await mongoose.connect(uri);

  const counts = await Category.productCounts();
  const slugs = [...counts.keys()].filter(Boolean).sort();

  if (slugs.length === 0) {
    console.error('No products found — run `node scripts/seedProducts.js` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const slug of slugs) {
    if (await Category.exists({ slug })) {
      skipped += 1;
      continue;
    }

    const order = ORDER.indexOf(slug);
    await Category.create({
      name: titleCase(slug),
      slug,
      description: DESCRIPTIONS[slug] || '',
      displayOrder: order === -1 ? ORDER.length : order,
      // The three biggest departments lead the home page's category row; the
      // rest are one click further in, under "All categories".
      isFeatured: ['smartphones', 'computing', 'gaming'].includes(slug),
      isActive: true,
    });

    created += 1;
    console.log(`  + ${titleCase(slug)} (/${slug}) — ${counts.get(slug)} products`);
  }

  const total = await Category.countDocuments();
  const stranded = await Product.countDocuments({
    $or: [{ category: { $exists: false } }, { category: null }, { category: '' }],
  });

  console.log(
    `\n${created} created, ${skipped} already present — ${total} categories in total.`,
  );
  if (stranded > 0) {
    console.warn(`${stranded} products have no category at all — they won't appear under any.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
