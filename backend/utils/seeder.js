import 'dotenv/config.js';
import Product from '../models/Product.js';
import products from '../data/products.json' assert { type: 'json' };
import connectDB from '../db/connect.js';

const seedProducts = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log('products added successfully');
    process.exit(0);
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};
seedProducts().catch((error) => {
  console.error('Error seeding products:', error);
  process.exit(1);
});
