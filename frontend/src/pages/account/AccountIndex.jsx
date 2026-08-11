import { Navigate } from 'react-router-dom';

/**
 * `/account` holds no content of its own — profile, orders, wishlist and
 * addresses are separate pages. It exists so the bare URL, and any old link to
 * it, still lands somewhere sensible.
 *
 * Orders for everyone, whatever the role. This used to send a vendor or admin
 * to their profile instead, on the assumption their own purchase history
 * wasn't what they came for — but `/account` is reached from the shopping half
 * of the app, and anyone who lands here got here by shopping. The dashboard is
 * where a vendor or admin goes to run the shop, and it has its own link.
 */
const AccountIndex = () => <Navigate to='/account/orders' replace />;

export default AccountIndex;
