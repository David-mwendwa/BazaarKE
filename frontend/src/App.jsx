import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AccountIndex from './pages/account/AccountIndex.jsx';
import OrdersPage from './pages/account/OrdersPage.jsx';
import ProfilePage from './pages/account/ProfilePage.jsx';
import AddressesPage from './pages/account/AddressesPage.jsx';
import WishlistPage from './pages/account/WishlistPage.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import DashboardGuard from './components/auth/DashboardGuard.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfirmProvider } from './context/ConfirmProvider.jsx';

// The dashboard (Radix primitives, data tables, admin screens) is only ever
// reached by vendors and admins — lazy-loading keeps it out of the bundle
// every shopper downloads.
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.jsx'));
const VendorOverview = lazy(() => import('./pages/dashboard/vendor/index.jsx'));
const VendorProducts = lazy(() => import('./pages/dashboard/vendor/Products.jsx'));
const VendorProductForm = lazy(() => import('./pages/dashboard/vendor/ProductForm.jsx'));
const VendorOrders = lazy(() => import('./pages/dashboard/vendor/Orders.jsx'));
const VendorQuestions = lazy(() => import('./pages/dashboard/vendor/Questions.jsx'));
const VendorAnalytics = lazy(() => import('./pages/dashboard/vendor/Analytics.jsx'));
const AdminOverview = lazy(() => import('./pages/dashboard/admin/index.jsx'));
const AdminProducts = lazy(() => import('./pages/dashboard/admin/Products.jsx'));
const AdminUsers = lazy(() => import('./pages/dashboard/admin/Users.jsx'));
const AdminOrders = lazy(() => import('./pages/dashboard/admin/Orders.jsx'));
const AdminCoupons = lazy(() => import('./pages/dashboard/admin/Coupons.jsx'));
const AdminCategories = lazy(() => import('./pages/dashboard/admin/Categories.jsx'));
const AdminPayments = lazy(() => import('./pages/dashboard/admin/Payments.jsx'));
const AdminAnalytics = lazy(() => import('./pages/dashboard/admin/Analytics.jsx'));

const DashboardFallback = () => (
  <div className='flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900'>
    <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent' />
    <span className='sr-only'>Loading dashboard…</span>
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// The storefront's own chrome (Navbar/Footer/centered container) — the
// dashboard renders its own full-page shell instead, so it lives outside
// this layout entirely rather than as another route nested inside it.
const StorefrontLayout = () => (
  <div className='min-h-screen bg-dark-50 flex flex-col'>
    {/* Visible only once tabbed to. Without it, reaching the products on
        /products means tabbing past the whole header — logo, search, account
        menu, cart, and every category link — on every page load. */}
    <a
      href='#main'
      className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white'>
      Skip to content
    </a>
    <Navbar />
    <ScrollToTop />
    <main id='main' className='flex-1'>
      {/* Top padding steps with the sides (4/6/8), so the gap under the header
          matches the gutter at every breakpoint instead of being a separate
          fixed value. */}
      <div className='max-w-page mx-auto px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 w-full'>
        <Outlet />
      </div>
    </main>
    <Footer />
  </div>
);

function App() {
  return (
    <Router>
      {/* Outermost of the providers: anything inside can ask before it acts,
          and the dialog itself needs none of the others. */}
      <ConfirmProvider>
      <AuthProvider>
        <CartProvider>
          {/* Inside AuthProvider: the wishlist is per-account and reloads
              whenever the signed-in user changes. */}
          <WishlistProvider>
          <Routes>
            <Route element={<StorefrontLayout />}>
              <Route path='/' element={<Home />} />
              <Route path='/products' element={<Products />} />
              <Route path='/product/:id' element={<ProductDetail />} />
              <Route path='/cart' element={<Cart />} />
              <Route path='/login' element={<Login />} />
              <Route path='/register' element={<Register />} />
              <Route path='/password/forgot' element={<ForgotPassword />} />
              <Route path='/password/reset/:token' element={<ResetPassword />} />

              <Route element={<ProtectedRoute />}>
                <Route path='/checkout' element={<Checkout />} />
                <Route path='/order-confirmation' element={<OrderConfirmation />} />
                {/* Profile and orders are separate pages, not two halves of
                    one account screen. `/account` itself holds nothing — it
                    forwards to whichever of them the role starts on. The
                    profile is shared by all three roles; a vendor editing
                    their own name shouldn't need a different page from a
                    shopper doing the same thing. */}
                <Route path='/account' element={<AccountIndex />} />
                <Route path='/account/orders' element={<OrdersPage />} />
                <Route path='/account/profile' element={<ProfilePage />} />
                <Route path='/account/addresses' element={<AddressesPage />} />
                <Route path='/account/wishlist' element={<WishlistPage />} />
              </Route>

              <Route path='*' element={<NotFound />} />
            </Route>

            <Route
              element={
                <Suspense fallback={<DashboardFallback />}>
                  <Outlet />
                </Suspense>
              }>
              <Route element={<DashboardGuard roles={['vendor']} />}>
                <Route path='/dashboard/vendor' element={<DashboardLayout />}>
                  <Route index element={<VendorOverview />} />
                  <Route path='products' element={<VendorProducts />} />
                  <Route path='products/new' element={<VendorProductForm />} />
                  <Route path='products/:id/edit' element={<VendorProductForm />} />
                  <Route path='orders' element={<VendorOrders />} />
                  <Route path='questions' element={<VendorQuestions />} />
                  <Route path='analytics' element={<VendorAnalytics />} />
                </Route>
              </Route>

              <Route element={<DashboardGuard roles={['admin']} />}>
                <Route path='/dashboard/admin' element={<DashboardLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path='products' element={<AdminProducts />} />
                  <Route path='users' element={<AdminUsers />} />
                  <Route path='orders' element={<AdminOrders />} />
                  <Route path='coupons' element={<AdminCoupons />} />
                  <Route path='categories' element={<AdminCategories />} />
                  <Route path='payments' element={<AdminPayments />} />
                  <Route path='analytics' element={<AdminAnalytics />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          <ToastContainer
            position='top-right'
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss={false}
            pauseOnHover
            draggable
            theme='colored'
            limit={3}
          />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
      </ConfirmProvider>
    </Router>
  );
}

export default App;
