import dotenv from 'dotenv';
import Product from '../models/Product.js';
import { readFile } from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory path in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Add mongoose strictQuery warning suppression
mongoose.set('strictQuery', false);

// ---------------------------------------------------
const CATEGORIES = [
  'accessories',
  'computing',
  'gaming',
  'smarthome',
  'smartphones',
  'tablets',
];
// ---------------------------------------------------

const seedCategory = async (CATEGORY) => {
    // Read the products data file
    const data = await readFile(
      path.join(__dirname, `../data/${CATEGORY}.json`),
      'utf-8'
    );
    const products = JSON.parse(data);
    // Remove all categories products first to prevent duplicates
    // await Product.deleteMany({ category: CATEGORY });
    // console.log(`Cleared existing ${CATEGORY} products`);
    // Process products in batches to avoid memory issues
    const batchSize = 50;
    let successCount = 0;
    let duplicateCount = 0;
    const duplicateUrls = new Set();
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchToInsert = batch.map(({ id, ...rest }) => ({
        ...rest,
        category: CATEGORY,
        vendor: '693ef1a59d48a0deb8755f56',
      }));
      try {
        // Try to insert the batch
        const result = await Product.insertMany(batchToInsert, {
          ordered: false, // Continue on error
        });
        successCount += result.length;
      } catch (error) {
        if (error.code === 11000) {
          // Handle duplicate key error
          const duplicateErrors = error.writeErrors || [];
          duplicateCount += duplicateErrors.length;
          duplicateErrors.forEach((err) => {
            if (err.errmsg) {
              const urlMatch = err.errmsg.match(
                /dup key: { urlPath: "([^"]+)" }/
              );
              if (urlMatch && urlMatch[1]) {
                duplicateUrls.add(urlMatch[1]);
              }
            }
          });
          // Get the successfully inserted documents
          const insertedCount = error.result?.insertedCount || 0;
          successCount += insertedCount;
        } else {
          throw error; // Re-throw other errors
        }
      }
    }
    console.log(`\n✅ Seeding Summary for ${CATEGORY}:`);
    console.log(`- Successfully inserted: ${successCount} products`);
    console.log(`- Skipped duplicates: ${duplicateCount} products`);

    if (duplicateUrls.size > 0) {
      console.log('\n⚠️  Duplicate URLs found:');
      duplicateUrls.forEach((url) => console.log(`  - ${url}`));
    }
    // Update configurable options for successfully inserted products
    const insertedProducts = await Product.find({ category: CATEGORY });
    console.log(`\nUpdating configurable options...`);

    let updatedCount = 0;
    for (const product of insertedProducts) {
      if (product.configurableOptions?.length > 0) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              'configurableOptions.$[].productId': product._id,
            },
          }
        );
        updatedCount++;
      }
    }
    console.log(`✅ Updated configurable options for ${updatedCount} products`);
};

const seedProducts = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }

    const DB = process.env.MONGO_PASSWORD
      ? process.env.MONGO_URI.replace('<PASSWORD>', process.env.MONGO_PASSWORD)
      : process.env.MONGO_URI;

    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connection successful');

    for (const category of CATEGORIES) {
      await seedCategory(category);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding products:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed after error');
    }
    process.exit(1);
  }
};

seedProducts();