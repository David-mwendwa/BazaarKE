import { useEffect, useState } from 'react';
import { Users, Package, ShoppingBag, BarChart2 } from 'lucide-react';

import { ROUTES } from '../../../constants/routes';
import { formatCurrency } from '../../../lib/utils';
import ContentSkeleton from '../shared/ContentSkeleton';
import { RecentOrders, StatCards } from '../shared/overview.jsx';
import apiClient from '../../../api/apiClient.js';

const AdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    Promise.all([
      // `GET /admin/users` returns the whole collection unpaged, so
      // `users.length` really is the total here.
      apiClient.get('/admin/users'),
      // limit=1 — only the `total` count is needed for the stat card.
      apiClient.get('/admin/products', { params: { limit: 1 } }),
      apiClient.get('/orders', { params: { limit: 5 } }),
    ])
      .then(([usersRes, productsRes, ordersRes]) => {
        const users = usersRes.data.users || [];
        const orders = ordersRes.data.data || [];

        setStats([
          {
            name: 'Total users',
            value: users.length.toLocaleString(),
            icon: Users,
            link: ROUTES.DASHBOARD.ADMIN_USERS,
          },
          {
            name: 'Total products',
            value: (productsRes.data.total || 0).toLocaleString(),
            icon: Package,
            link: ROUTES.DASHBOARD.ADMIN_PRODUCTS,
          },
          {
            name: 'Total orders',
            value: (ordersRes.data.total ?? orders.length).toLocaleString(),
            icon: ShoppingBag,
            link: ROUTES.DASHBOARD.ADMIN_ORDERS,
          },
          // No `link` — there's no revenue screen to open. See StatCards.
          {
            name: 'Revenue',
            value: formatCurrency(ordersRes.data.totalAmount || 0),
            icon: BarChart2,
          },
        ]);

        setRecentOrders(
          orders.map((order) => ({
            id: order._id,
            orderNumber: order.orderNumber,
            customer: order.user
              ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() ||
                order.user.email
              : 'Customer',
            amount: order.total?.amount || 0,
            status: order.status,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    // Matches the page: stat cards then a table. No chart placeholders — this
    // screen has no charts, and the skeleton used to promise two.
    return (
      <ContentSkeleton
        variant='stats'
        headerActionWidth={null}
        showStats={true}
        cardCount={4}
        showTable={true}
        columns={4}
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
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Admin dashboard</h1>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
          Platform-wide overview of users, products, and orders.
        </p>
      </div>

      <StatCards stats={stats} />
      <RecentOrders orders={recentOrders} viewAllHref={ROUTES.DASHBOARD.ADMIN_ORDERS} />
    </div>
  );
};

export default AdminOverview;
