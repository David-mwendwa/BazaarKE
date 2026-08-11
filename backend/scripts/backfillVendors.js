import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
mongoose.set('strictQuery', false);

// The scraped seed catalog (scripts/seedProducts.js) carries no vendor, and
// order line items predate the `items.vendor` field. This script gives the
// demo data real multi-vendor attribution so the vendor/admin dashboards show
// meaningful, correctly-scoped data. Idempotent: re-running only fills gaps.

// Categories are split across sellers so each vendor has a coherent
// storefront rather than a random slice of everything.
const VENDORS = [
  {
    firstName: 'Demo',
    lastName: 'Vendor',
    email: 'demo.vendor@bazaarke.dev',
    businessName: 'Demo Vendor Store',
    categories: ['smartphones', 'tablets'],
  },
  {
    firstName: 'Nexus',
    lastName: 'Electronics',
    email: 'vendor.nexus@bazaarke.dev',
    businessName: 'Nexus Electronics',
    categories: ['computing', 'accessories'],
  },
  {
    firstName: 'Pulse',
    lastName: 'Gaming',
    email: 'vendor.pulse@bazaarke.dev',
    businessName: 'Pulse Gaming & Smart Home',
    categories: ['gaming', 'smarthome'],
  },
];

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connection successful\n');

    // 1) Ensure a user account exists for each vendor
    const vendorIds = {};
    for (const v of VENDORS) {
      let user = await User.findOne({ email: v.email });
      if (!user) {
        user = await User.create({
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          password: 'Demo1234',
          passwordConfirm: 'Demo1234',
          role: 'vendor',
          vendorInfo: { businessName: v.businessName, isVerified: true },
        });
        console.log(`✅ Created vendor account ${v.email}`);
      } else {
        console.log(`- Vendor account already exists (${v.email})`);
      }
      vendorIds[v.email] = user._id;
    }

    // 2) Assign unowned products to a vendor based on category.
    //
    // "Unowned" includes products whose `vendor` points at a user that no
    // longer exists — the scraped seed catalog carries a stale ObjectId
    // inherited from MarketHub's database, so the reference is set but
    // dangling (populate yields null). Checking only for null/missing would
    // silently match nothing.
    console.log('');
    const validVendorIds = (await User.find({}).select('_id').lean()).map((u) =>
      u._id.toString(),
    );
    const orphanedProductIds = (
      await Product.find({}).select('_id vendor').lean()
    )
      .filter((p) => !p.vendor || !validVendorIds.includes(p.vendor.toString()))
      .map((p) => p._id);

    console.log(`   ${orphanedProductIds.length} products need attribution`);

    let assigned = 0;
    for (const v of VENDORS) {
      const res = await Product.updateMany(
        { _id: { $in: orphanedProductIds }, category: { $in: v.categories } },
        { $set: { vendor: vendorIds[v.email] } },
      );
      assigned += res.modifiedCount;
      console.log(
        `✅ ${v.businessName}: assigned ${res.modifiedCount} products (${v.categories.join(', ')})`,
      );
    }

    // Any category not covered above falls to the first vendor so nothing is
    // left unowned (the admin Products "Vendor" column would show "—").
    const leftover = await Product.updateMany(
      {
        _id: { $in: orphanedProductIds },
        category: { $nin: VENDORS.flatMap((v) => v.categories) },
      },
      { $set: { vendor: vendorIds[VENDORS[0].email] } },
    );
    if (leftover.modifiedCount > 0) {
      console.log(
        `✅ ${leftover.modifiedCount} uncategorised products assigned to ${VENDORS[0].businessName}`,
      );
      assigned += leftover.modifiedCount;
    }
    console.log(`   → ${assigned} products newly attributed`);

    // 3) Backfill items.vendor on existing orders from each item's product
    console.log('');
    const orders = await Order.find({
      'items.0': { $exists: true },
    }).select('items');

    // Same orphan rule as products: an item's vendor needs (re)writing if it
    // is unset OR points at a user that no longer exists.
    const needsVendor = (item) =>
      item.product &&
      (!item.vendor || !validVendorIds.includes(item.vendor.toString()));

    let ordersTouched = 0;
    let itemsFilled = 0;
    for (const order of orders) {
      const missing = order.items.filter(needsVendor);
      if (missing.length === 0) continue;

      const products = await Product.find({
        _id: { $in: missing.map((i) => i.product) },
      })
        .select('vendor')
        .lean();
      const vendorByProduct = new Map(
        products.map((p) => [p._id.toString(), p.vendor]),
      );

      let changed = false;
      for (const item of order.items) {
        if (!needsVendor(item)) continue;
        const vendor = vendorByProduct.get(item.product.toString());
        if (vendor) {
          item.vendor = vendor;
          itemsFilled += 1;
          changed = true;
        }
      }
      if (changed) {
        // validateBeforeSave: these are historical orders that may predate
        // current required-field rules; we only want the vendor write.
        await order.save({ validateBeforeSave: false });
        ordersTouched += 1;
      }
    }
    console.log(
      `✅ Backfilled ${itemsFilled} line items across ${ordersTouched} orders`,
    );

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error backfilling vendors:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

run();
