import { useEffect, useState } from 'react';
import { Package, ShoppingBag, BarChart2, Clock } from 'lucide-react';

import { ROUTES } from '../../../constants/routes';
import { formatCurrency } from '../../../lib/utils';
import ContentSkeleton from '../shared/ContentSkeleton';
import { RecentOrders, StatCards } from '../shared/overview.jsx';
import apiClient from '../../../api/apiClient.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const VendorOverview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    if (!user?._id) return;

    Promise.all([
      // limit=1 — only the `total` count is needed here, not the catalog.
      apiClient.get('/vendor/products', { params: { limit: 1 } }),
      apiClient.get(`/orders/vendor/${user._id}`),
    ])
      .then(([productsRes, ordersRes]) => {
        const orders = ordersRes.data.data || [];

        // vendorSubtotal comes from the API already scoped to this vendor's
        // line items, so there's nothing to filter or re-derive client-side.
        const revenue = orders.reduce((sum, o) => sum + (o.vendorSubtotal?.amount || 0), 0);
        const awaitingFulfilment = orders.filter((o) =>
          ['pending', 'processing'].includes(o.status)
        ).length;

        setStats([
          {
            name: 'Total products',
            value: (productsRes.data.total || 0).toLocaleString(),
            icon: Package,
            link: ROUTES.DASHBOARD.VENDOR_PRODUCTS,
          },
          {
            name: 'Total orders',
            value: orders.length.toLocaleString(),
            icon: ShoppingBag,
            link: ROUTES.DASHBOARD.VENDOR_ORDERS,
          },
          // No `link` — there's no revenue screen to open. See StatCards.
          { name: 'Revenue', value: formatCurrency(revenue), icon: BarChart2 },
          // Actionable beats decorative on a vendor's landing page — this is
          // the number that tells them there's work waiting.
          {
            name: 'Needs fulfilment',
            value: awaitingFulfilment.toLocaleString(),
            icon: Clock,
            link: ROUTES.DASHBOARD.VENDOR_ORDERS,
          },
        ]);

        setRecentOrders(
          orders.slice(0, 5).map((order) => ({
            id: order._id,
            orderNumber: order.orderNumber,
            customer: order.user
              ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() ||
                order.user.email
              : 'Customer',
            product: order.items[0]?.product?.name || order.items[0]?.name || '—',
            amount: order.vendorSubtotal?.amount || 0,
            status: order.status,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (loading) {
    // Four stat cards and a table — which is what this page is. It used to ask
    // for two chart placeholders as well, promising graphs that never arrive.
    return (
      <ContentSkeleton
        variant='stats'
        headerActionWidth={null}
        showStats={true}
        cardCount={4}
        showTable={true}
        columns={5}
        rows={5}
        hasCheckboxes={false}
        hasActions={false}
        showFilters={false}
        showPagination={false}
        className='space-y-8'
      />
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Vendor dashboard</h1>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
          Welcome back! Here's an overview of your store's performance.
        </p>
      </div>

      <StatCards stats={stats} />
      <RecentOrders
        orders={recentOrders}
        viewAllHref={ROUTES.DASHBOARD.VENDOR_ORDERS}
        showProduct
      />
    </div>
  );
};

export default VendorOverview;
