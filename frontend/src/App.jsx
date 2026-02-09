import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { OrderProvider } from './contexts/OrderContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
// Shop pages
import {
  Home,
  Shop,
  ProductDetails,
  Categories,
  SearchResults,
} from './pages/shop';

// Auth pages
import {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
} from './pages/auth';

// Company pages
import { About, Contact, Help } from './pages/company';

// Checkout pages
import { Cart, Checkout } from './pages/checkout';

// Legal pages
import {
  PrivacyPolicy,
  TermsOfService,
  DeliveryReturns,
  FAQs,
} from './pages/legal';

// Error pages
import { NotFound, Unauthorized } from './pages/error';
import { ROUTES } from './constants/routes';
import DashboardLayout from './pages/dashboard/DashboardLayout';

// Dashboard components
import AdminDashboard from './pages/dashboard/admin';
import AdminUsers from './pages/dashboard/admin/Users';
import AdminProducts from './pages/dashboard/admin/Products';
import ProductDetailsPage from './pages/dashboard/admin/components/ProductDetails.jsx';
import VendorProductDetailsPage from './pages/dashboard/vendor/components/ProductDetails.jsx';
import AdminOrders from './pages/dashboard/admin/Orders';
import AdminAnalytics from './pages/dashboard/admin/Analytics';
import AdminSupport from './pages/dashboard/admin/Support';
import UserDetails from './pages/dashboard/admin/components/UserDetails.jsx';
import AdminCategories from './pages/dashboard/admin/Categories';
import AddCategory from './pages/dashboard/admin/components/CategoryForm.jsx';

import VendorDashboard from './pages/dashboard/vendor';
import VendorProducts from './pages/dashboard/vendor/Products';
import VendorOrders from './pages/dashboard/vendor/Orders';
import VendorAnalytics from './pages/dashboard/vendor/Analytics';
import AddProduct from './pages/dashboard/shared/ProductForm.jsx';
import ViewOrder from './pages/dashboard/vendor/ViewOrder';

import CustomerDashboard from './pages/dashboard/customer';
import CustomerOrders from './pages/dashboard/customer/Orders';
import OrderConfirmation from './components/order/OrderConfirmation.original';
import OrderDetails from './components/order/OrderDetails';
import Addresses from './pages/dashboard/customer/Addresses';
import Payments from './pages/dashboard/customer/Payments';

// Account section components
import AccountLayout from './pages/account/AccountLayout';
import ProfilePage from './pages/account/ProfilePage';
import NotificationsPage from './pages/account/NotificationsPage';
import SettingsPage from './pages/account/SettingsPage';
import SecurityPage from './pages/account/SecurityPage';
import Wishlist from './pages/dashboard/customer/Wishlist';

import './App.css';

// Main App component
function App() {
  return (
    <ErrorBoundary
      fallbackTitle='Oops! Something went wrong'
      fallbackMessage="We're sorry for the inconvenience. Our team is addressing the issue. Please try refreshing the page"
      resetText='Reload Page'
      onReset={() => window.location.reload()}>
      <Layout>
        <Routes>
          {/* ========== Public Routes ========== */}
          <Route index element={<Home />} />
          <Route path={ROUTES.SHOP} element={<Shop />} />
          <Route path={ROUTES.ABOUT} element={<About />} />
          <Route path={ROUTES.CONTACT} element={<Contact />} />
          <Route path={ROUTES.PRODUCT} element={<ProductDetails />} />
          <Route path={ROUTES.CATEGORIES} element={<Categories />} />
          <Route path={ROUTES.SEARCH} element={<SearchResults />} />
          <Route path={ROUTES.FAQ} element={<FAQs />} />
          <Route path={ROUTES.CART} element={<Cart />} />
          <Route path={ROUTES.CHECKOUT} element={<Checkout />} />

          {/* ========== Auth Routes ========== */}
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />

          {/* ========== Account Routes ========== */}
          <Route path={ROUTES.ACCOUNT.BASE} element={<AccountLayout />}>
            <Route
              index
              element={
                <Navigate
                  to={ROUTES.ACCOUNT.PROFILE.split('/').pop()}
                  replace
                />
              }
            />
            <Route
              path={ROUTES.ACCOUNT.PROFILE.split('/').pop()}
              element={<ProfilePage />}
            />
            <Route
              path={ROUTES.ACCOUNT.NOTIFICATIONS.split('/').pop()}
              element={<NotificationsPage />}
            />
            <Route
              path={ROUTES.ACCOUNT.SETTINGS.split('/').pop()}
              element={<SettingsPage />}
            />
            <Route
              path={ROUTES.ACCOUNT.SECURITY.split('/').pop()}
              element={<SecurityPage />}
            />
          </Route>

          {/* Old Settings Route - Keeping for backward compatibility - Redirect to new account settings */}
          <Route
            path={ROUTES.SETTINGS}
            element={<Navigate to={ROUTES.ACCOUNT.SETTINGS} replace />}
          />

          <Route path={ROUTES.HELP} element={<Help />} />
          <Route
            path={ROUTES.ORDER_CONFIRMATION}
            element={<OrderConfirmation />}
          />

          {/* Dashboard Routes */}
          <Route path={ROUTES.DASHBOARD.ADMIN} element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route
              path={ROUTES.DASHBOARD.ADMIN_USERS.split('/').pop()}
              element={<AdminUsers />}
            />
            <Route
              path={`${ROUTES.DASHBOARD.ADMIN_USERS.split('/').pop()}/:userId`}
              element={<UserDetails />}
            />
            <Route path={ROUTES.DASHBOARD.ADMIN_PRODUCTS.split('/').pop()}>
              <Route index element={<AdminProducts />} />
              <Route path=':productId' element={<ProductDetailsPage />} />
            </Route>
            <Route
              path={ROUTES.DASHBOARD.ADMIN_ORDERS.split('/').pop()}
              element={<AdminOrders />}
            />
            <Route
              path={ROUTES.DASHBOARD.ADMIN_ANALYTICS.split('/').pop()}
              element={<AdminAnalytics />}
            />
            <Route path='support' element={<AdminSupport />} />

            {/* Category Management */}
            <Route path={ROUTES.DASHBOARD.ADMIN_CATEGORIES.split('/').pop()}>
              <Route index element={<AdminCategories />} />
              <Route path='new' element={<AddCategory />} />
              <Route path=':id/edit' element={<AddCategory />} />
            </Route>
          </Route>

          <Route path={ROUTES.DASHBOARD.VENDOR} element={<DashboardLayout />}>
            <Route index element={<VendorDashboard />} />
            <Route path={ROUTES.DASHBOARD.VENDOR_PRODUCTS.split('/').pop()}>
              <Route index element={<VendorProducts />} />
              <Route path='new' element={<AddProduct />} />
              <Route path=':productId' element={<VendorProductDetailsPage />} />
            </Route>
            <Route path={ROUTES.DASHBOARD.VENDOR_ORDERS.split('/').pop()}>
              <Route index element={<VendorOrders />} />
              <Route path=':orderId' element={<ViewOrder />} />
            </Route>
            <Route
              path={ROUTES.DASHBOARD.VENDOR_ANALYTICS.split('/').pop()}
              element={<VendorAnalytics />}
            />
          </Route>

          <Route path={ROUTES.DASHBOARD.CUSTOMER} element={<DashboardLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route
              path={ROUTES.DASHBOARD.CUSTOMER_ORDERS.split('/').pop()}
              element={<CustomerOrders />}
            />
            <Route
              path={ROUTES.DASHBOARD.CUSTOMER_WISHLIST.split('/').pop()}
              element={<Wishlist />}
            />
            <Route
              path={ROUTES.DASHBOARD.CUSTOMER_ADDRESSES.split('/').pop()}
              element={<Addresses />}
            />
            <Route
              path={ROUTES.DASHBOARD.CUSTOMER_PAYMENTS.split('/').pop()}
              element={<Payments />}
            />
          </Route>

          {/* ========== Legal & Info ========== */}
          <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
          <Route path={ROUTES.TERMS} element={<TermsOfService />} />
          <Route path={ROUTES.DELIVERY_RETURNS} element={<DeliveryReturns />} />
          <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />

          {/* 404 - Not Found */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
