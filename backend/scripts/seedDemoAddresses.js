import 'dotenv/config';
import mongoose from 'mongoose';

import User from '../models/User.js';

/**
 * Three saved addresses for the demo customer, so the checkout's address
 * picker and the account address book have something in them without anyone
 * typing an address by hand.
 *
 *   npm run seed:demo-addresses
 *
 * The cities are chosen to span the delivery zones in `utils/shipping.js` —
 * Nairobi (Ksh 300), a major town (Ksh 500) and a countrywide one (Ksh 800) —
 * so switching address at checkout visibly changes the fee.
 *
 * Idempotent: an address already saved under the same label is left alone,
 * including if you've since edited it.
 */
const EMAIL = 'demo.customer@bazaarke.dev';

const ADDRESSES = [
  {
    type: 'home',
    firstName: 'Demo',
    lastName: 'Customer',
    address1: '14 Riverside Drive',
    address2: 'Apartment 3B',
    city: 'Nairobi',
    postalCode: '00100',
    country: 'Kenya',
    phone: '0712345678',
    isDefault: true,
  },
  {
    type: 'work',
    firstName: 'Demo',
    lastName: 'Customer',
    company: 'BazaarKE Ltd',
    address1: 'Kenyatta Avenue, Prosperity House',
    address2: '5th floor',
    city: 'Nakuru',
    postalCode: '20100',
    country: 'Kenya',
    phone: '0722000111',
    isDefault: false,
  },
  {
    type: 'other',
    firstName: 'Demo',
    lastName: 'Customer',
    address1: "Rose Muhando Street, off Kisii-Kilgoris Rd",
    city: 'Kisii',
    postalCode: '40200',
    country: 'Kenya',
    phone: '0733222444',
    isDefault: false,
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bazaarke');

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.error(`No account for ${EMAIL} — run \`npm run seed:demo-users\` first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  for (const address of ADDRESSES) {
    if (user.addresses.some((a) => a.type === address.type)) {
      console.log(`· ${address.type} address already exists — left alone`);
      continue;
    }
    user.addresses.push(address);
    console.log(`✓ ${address.type} address added (${address.city})`);
  }

  // One default, whatever the data above says, and whatever was there before.
  user.addresses.forEach((a) => (a.isDefault = false));
  const home = user.addresses.find((a) => a.type === 'home') || user.addresses[0];
  if (home) home.isDefault = true;

  await user.save({ validateModifiedOnly: true });
  console.log(`Default: ${home?.type} — ${home?.city}`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
