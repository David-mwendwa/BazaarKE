import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import apiClient from '../../../api/apiClient.js';
import { ROUTES } from '../../../constants/routes';
import { formatCurrency } from '../../../lib/utils';
import ContentSkeleton from '../shared/ContentSkeleton';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import {
  MethodologyNote,
  MetricTile,
  Panel,
  RangePicker,
} from '../shared/analytics.jsx';
import { statusSegments } from '../shared/tokens.js';
import { BarList, StackedBar, TrendChart } from '../shared/charts.jsx';

/**
 * Platform analytics.
 *
 * Every figure is computed from orders, products and users. There is no
 * traffic, conversion or funnel section, because nothing in this app records a
 * page view — a chart of numbers nobody measures would be worse than its
 * absence.
 */
const AdminAnalytics = () => {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/analytics/admin', { params: { range } })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading && !data) return <ContentSkeleton showStats variant='stats' showTable rows={6} />;
  if (!data) return null;

  const { totals, change, series, statusBreakdown, topProducts, topCategories, topVendors, catalogue } =
    data;

  const orderCount = statusBreakdown.reduce((sum, row) => sum + row.count, 0);
  const cancelled = statusBreakdown.find((row) => row.status === 'cancelled')?.count || 0;

  return (
    <div className='space-y-6'>
      <PageHeader title='Analytics' description={data.range.label}>
        <PageHeaderFilters>
          <RangePicker value={range} onChange={setRange} />
        </PageHeaderFilters>
      </PageHeader>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricTile
          label='Revenue'
          value={formatCurrency(totals.revenue)}
          change={change?.revenue}
        />
        <MetricTile label='Orders' value={totals.orders} change={change?.orders} />
        <MetricTile
          label='Average order'
          value={formatCurrency(totals.averageOrderValue)}
          change={change?.averageOrderValue}
        />
        <MetricTile
          label='Customers who bought'
          value={totals.customers}
          change={change?.customers}
          hint={`${totals.newCustomers} new account${totals.newCustomers === 1 ? '' : 's'} registered`}
        />
      </div>

      <Panel
        title='Revenue over time'
        aside={
          <span className='text-xs text-muted-foreground'>
            {totals.units} unit{totals.units === 1 ? '' : 's'} sold
          </span>
        }>
        <TrendChart series={series} granularity={data.range.granularity} metric='revenue' />
      </Panel>

      <div className='grid gap-5 lg:grid-cols-2'>
        <Panel
          title='Where the orders are'
          aside={
            <Link
              to={ROUTES.DASHBOARD.ADMIN_ORDERS}
              className='text-sm font-medium text-primary-600 hover:text-primary-500'>
              Open orders
            </Link>
          }>
          <StackedBar
            segments={statusSegments(statusBreakdown)}
            total={orderCount}
            emptyLabel='No orders placed in this period.'
          />
          {cancelled > 0 && (
            <p className='mt-4 text-xs text-muted-foreground'>
              {Math.round((cancelled / orderCount) * 100)}% of orders in this period were cancelled.
              Cancelled and refunded orders are excluded from revenue above.
            </p>
          )}
        </Panel>

        {/* Money ordered but not collected. This is the number the Payments
            queue exists to shrink, so it links straight there. */}
        <Panel
          title='Money in and money owed'
          aside={
            <Link
              to={ROUTES.DASHBOARD.ADMIN_PAYMENTS}
              className='text-sm font-medium text-primary-600 hover:text-primary-500'>
              Verify payments
            </Link>
          }>
          <dl className='space-y-3'>
            {[
              ['Revenue booked', formatCurrency(totals.revenue), null],
              [
                'Not yet paid',
                formatCurrency(totals.unpaidValue),
                'Orders placed and not cancelled with no payment recorded — mostly cash on delivery.',
              ],
              [
                'Discounts given',
                `−${formatCurrency(totals.discountGiven)}`,
                'Promo codes are platform-funded, so vendors are paid in full regardless.',
              ],
              ['Delivery charged', formatCurrency(totals.deliveryCharged), null],
            ].map(([label, value, hint]) => (
              <div key={label}>
                <div className='flex items-baseline justify-between gap-3'>
                  <dt className='text-sm text-muted-foreground'>{label}</dt>
                  <dd className='text-sm font-medium tabular-nums text-foreground'>{value}</dd>
                </div>
                {hint && <p className='mt-0.5 text-xs text-muted-foreground'>{hint}</p>}
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className='grid gap-5 lg:grid-cols-2'>
        <Panel title='Best sellers'>
          <BarList
            items={topProducts.map((product) => ({
              key: product._id,
              label: product.name,
              revenue: product.revenue,
              units: product.units,
            }))}
            emptyLabel='Nothing sold in this period.'
          />
        </Panel>

        <Panel title='By category'>
          <BarList
            items={topCategories.map((category) => ({
              key: category.category,
              label: category.category,
              revenue: category.revenue,
              units: category.units,
            }))}
            emptyLabel='Nothing sold in this period.'
          />
        </Panel>
      </div>

      <div className='grid gap-5 lg:grid-cols-2'>
        <Panel title='Top vendors'>
          <BarList
            items={topVendors.map((vendor) => ({
              key: vendor._id,
              label: vendor.name,
              revenue: vendor.revenue,
              units: vendor.units,
            }))}
            emptyLabel='No vendor sales in this period.'
          />
        </Panel>

        {/* Not windowed — stock is a fact about right now, and "how many
            products were low three weeks ago" is not a thing anyone acts on. */}
        <Panel
          title='Catalogue right now'
          aside={
            <Link
              to={ROUTES.DASHBOARD.ADMIN_PRODUCTS}
              className='text-sm font-medium text-primary-600 hover:text-primary-500'>
              Open products
            </Link>
          }>
          <dl className='grid grid-cols-2 gap-4'>
            {[
              ['Products listed', catalogue.products],
              ['Visible', catalogue.active],
              ['Out of stock', catalogue.outOfStock],
              ['Three or fewer left', catalogue.lowStock],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className='text-xs text-muted-foreground'>{label}</dt>
                <dd className='text-lg font-semibold tabular-nums text-foreground'>{value}</dd>
              </div>
            ))}
          </dl>
          <p className='mt-4 border-t border-input pt-3 text-sm text-muted-foreground'>
            Stock on hand is worth{' '}
            <span className='font-medium text-foreground'>{formatCurrency(catalogue.stockValue)}</span>{' '}
            at list price.
          </p>
        </Panel>
      </div>

      <MethodologyNote>
        Revenue counts every order that hasn't been cancelled or refunded, at the moment it was
        placed — not when it was paid, since cash on delivery stays unpaid for its whole life and
        excluding it would hide most of the shop's sales. Comparisons are against the equal period
        immediately before this one, and are omitted where there's nothing to compare against.
      </MethodologyNote>
    </div>
  );
};

export default AdminAnalytics;
