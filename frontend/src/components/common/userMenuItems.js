import { FiGrid, FiHeart, FiLogOut, FiMapPin, FiShoppingBag, FiUser } from 'react-icons/fi';

/**
 * Everything an account can reach from the header, keyed by role — the shape
 * MarketHub's Header uses (common items, then role-specific, then sign out).
 *
 * Exported because the mobile panel renders the same list inline instead of in
 * a dropdown; one definition means the two can't drift, which is exactly how
 * the mobile menu ended up sending admins to the *vendor* dashboard.
 */
export const userMenuItems = (user) => {
  if (!user) return [];

  // One destination per role, not a second copy of the sidebar: Products and
  // Orders are the first two links inside the dashboard, so listing them here
  // too just makes the menu longer to read for no reach it didn't already have.
  //
  // Labels are bare nouns. The menu hangs off your own avatar and only ever
  // shows your own role's destination, so "My profile" and "Vendor dashboard"
  // were both restating what the surrounding context already said.
  const dashboard = {
    admin: { label: 'Dashboard', to: '/dashboard/admin', icon: FiGrid },
    vendor: { label: 'Dashboard', to: '/dashboard/vendor', icon: FiGrid },
  }[user.role];

  /**
   * Every account gets the shopping links.
   *
   * These used to be customer-only, on the reasoning that a vendor or admin
   * signs in to run the shop rather than to buy from it. Nothing enforced
   * that: the cart, checkout and `POST /orders` never checked a role, so an
   * admin could fill a basket and place an order and then have no link
   * anywhere back to it — the seeded demo admin owns an order they cannot
   * open. Hiding the way back doesn't prevent the purchase, it just strands
   * it, so the links are for everyone and the purchase is supported.
   */
  const shopping = [
    { label: 'Orders', to: '/account/orders', icon: FiShoppingBag },
    { label: 'Wishlist', to: '/account/wishlist', icon: FiHeart },
    { label: 'Addresses', to: '/account/addresses', icon: FiMapPin },
  ];

  return [
    // Running the shop comes first for the roles that do it — that's what
    // they signed in for; their own basket is the sideline.
    ...(dashboard ? [dashboard] : []),
    { label: 'Profile', to: '/account/profile', icon: FiUser },
    ...shopping,
    { label: 'Sign out', action: 'logout', icon: FiLogOut, danger: true, divider: true },
  ];
};
