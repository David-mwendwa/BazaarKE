/**
 * ROUTES - URL Path Constants
 *
 * Ported exactly from MarketHub's dashboard routing (see that project's
 * src/constants/routes.js) — only the DASHBOARD section and the
 * navigation/link maps that drive DashboardLayout are used here; BazaarKE's
 * storefront routes are still defined directly in App.jsx.
 */
export const ROUTES = {
  HOME: '/',

  // Dashboard routes
  DASHBOARD: {
    // Admin routes
    ADMIN: '/dashboard/admin',
    ADMIN_USERS: '/dashboard/admin/users',
    ADMIN_PRODUCTS: '/dashboard/admin/products',
    ADMIN_ORDERS: '/dashboard/admin/orders',
    ADMIN_COUPONS: '/dashboard/admin/coupons',
    ADMIN_PAYMENTS: '/dashboard/admin/payments',
    ADMIN_ANALYTICS: '/dashboard/admin/analytics',
    ADMIN_CATEGORIES: '/dashboard/admin/categories',
    ADMIN_ADD_CATEGORY: '/dashboard/admin/categories/new',
    ADMIN_EDIT_CATEGORY: '/dashboard/admin/categories/:id/edit',

    // Vendor routes
    VENDOR: '/dashboard/vendor',
    VENDOR_PRODUCTS: '/dashboard/vendor/products',
    VENDOR_PRODUCT_NEW: '/dashboard/vendor/products/new',
    VENDOR_PRODUCT_DETAILS: '/dashboard/vendor/products/:productId',
    VENDOR_ORDERS: '/dashboard/vendor/orders',
    VENDOR_ORDER_DETAILS: '/dashboard/vendor/orders/:orderId',
    VENDOR_QUESTIONS: '/dashboard/vendor/questions',
    VENDOR_ANALYTICS: '/dashboard/vendor/analytics',

    // Customer routes (BazaarKE's `user` role maps to the `customer` URL
    // segment here, matching MarketHub's scheme exactly — the role stored on
    // the account is still `user`)
    CUSTOMER: '/dashboard/customer',
    CUSTOMER_ORDERS: '/dashboard/customer/orders',
    CUSTOMER_WISHLIST: '/dashboard/customer/wishlist',
    CUSTOMER_ADDRESSES: '/dashboard/customer/addresses',
    CUSTOMER_PAYMENTS: '/dashboard/customer/payments',
  },
};

/**
 * Where an account belongs after signing in. Vendors and admins run the app
 * from their dashboard, so dropping them on the storefront home page just
 * costs them a click; customers have no dashboard to go to.
 *
 * An explicit `from` (set by ProtectedRoute/DashboardGuard when they bounce a
 * request to /login) always wins over this — finish what the user asked for.
 */
export const roleLandingPath = (role) =>
  role === 'admin'
    ? ROUTES.DASHBOARD.ADMIN
    : role === 'vendor'
      ? ROUTES.DASHBOARD.VENDOR
      : ROUTES.HOME;

/**
 * DASHBOARD_LINKS - Navigation Menu Configuration
 *
 * Defines the navigation structure for dashboard menus, organized by user role.
 */
export const DASHBOARD_LINKS = {
  admin: [
    { name: 'Overview', path: '/dashboard/admin', icon: 'Grid' },
    { name: 'Users', path: '/dashboard/admin/users', icon: 'Users' },
    { name: 'Products', path: '/dashboard/admin/products', icon: 'Package' },
    { name: 'Orders', path: '/dashboard/admin/orders', icon: 'ShoppingBag' },
    { name: 'Categories', path: '/dashboard/admin/categories', icon: 'FolderTree' },
    { name: 'Promo codes', path: '/dashboard/admin/coupons', icon: 'Tag' },
    { name: 'Payments', path: '/dashboard/admin/payments', icon: 'BadgeCheck' },
    { name: 'Analytics', path: '/dashboard/admin/analytics', icon: 'BarChart3' },
  ],
  vendor: [
    { name: 'Overview', path: '/dashboard/vendor', icon: 'LayoutDashboard' },
    { name: 'Products', path: '/dashboard/vendor/products', icon: 'Package' },
    { name: 'Orders', path: '/dashboard/vendor/orders', icon: 'ShoppingBag' },
    { name: 'Questions', path: '/dashboard/vendor/questions', icon: 'MessageSquare' },
    { name: 'Analytics', path: '/dashboard/vendor/analytics', icon: 'BarChart3' },
  ],
  // Customers have no dashboard. They get storefront pages instead —
  // `/account/orders`, `/account/addresses`, `/account/profile` — reached from
  // the header's user menu, and `DashboardGuard` admits only vendors and
  // admins anyway.
  //
  // This used to list four `/dashboard/customer/*` links (Orders, Wishlist,
  // Addresses, Payment Methods). None of those routes were ever registered:
  // two now exist under `/account`, and the other two are features that don't
  // exist at all. Nothing rendered them, so nothing broke — but the next
  // person to read this file would have believed them.
  customer: [],
};
