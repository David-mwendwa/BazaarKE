import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
mongoose.set('strictQuery', false);

// One demo login per role, so the login page can offer a one-click
// "try it as a customer/vendor/admin" experience without real user data.
const DEMO_USERS = [
  {
    firstName: 'Demo',
    lastName: 'Customer',
    email: 'demo.customer@bazaarke.dev',
    password: 'Demo1234',
    passwordConfirm: 'Demo1234',
    role: 'user',
  },
  {
    firstName: 'Demo',
    lastName: 'Vendor',
    email: 'demo.vendor@bazaarke.dev',
    password: 'Demo1234',
    passwordConfirm: 'Demo1234',
    role: 'vendor',
    vendorInfo: { businessName: 'Demo Vendor Store', isVerified: true },
  },
  {
    firstName: 'Demo',
    lastName: 'Admin',
    email: 'demo.admin@bazaarke.dev',
    password: 'Demo1234',
    passwordConfirm: 'Demo1234',
    role: 'admin',
  },
];

const seedDemoUsers = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connection successful');

    for (const demo of DEMO_USERS) {
      const existing = await User.findOne({ email: demo.email });
      if (existing) {
        console.log(`- ${demo.role} demo account already exists (${demo.email})`);
        continue;
      }
      await User.create(demo);
      console.log(`✅ Created ${demo.role} demo account (${demo.email})`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding demo users:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedDemoUsers();
