import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Star } from 'lucide-react';

import apiClient from '../../../api/apiClient.js';
import { ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../context/AuthContext.jsx';
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
 * A vendor's own numbers.
 *
 * Scoped to their line items, not to whole orders: an order holding two
 * sellers' products belongs to both, and each sees only their half. Same
 * `items.vendor` field the vendor order list is scoped on.
 */
const VendorAnalytics = () => {
  const { user } = useAuth();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const vendorId = user?._id;

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    apiClient
      .get(`/analytics/vendor/${vendorId}`, { params: { range } })
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [range, vendorId]);

  if (loading && !data) return <ContentSkeleton showStats variant='stats' showTable rows={6} />;
  if (!data) return null;

  const { totals, change, series, statusBreakdown, topProducts, topCategories, lowStock, reputation } =
    data;

  const orderCount = statusBreakdown.reduce((sum, row) => sum + row.count, 0);
  const toPack = statusBreakdown
    .filter((row) => ['pending', 'processing'].includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);

  return (
    <div className='space-y-6'>
      <PageHeader title='Analytics' description={data.range.label}>
        <PageHeaderFilters>
          <RangePicker value={range} onChange={setRange} />
        </PageHeaderFilters>
      </PageHeader>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricTile label='Your revenue' value={formatCurrency(totals.revenue)} change={change?.revenue} />
        <MetricTile
          label='Orders with your items'
          value={totals.orders}
          change={change?.orders}
          hint={toPack > 0 ? `${toPack} still to fulfil` : undefined}
        />
        <MetricTile label='Units sold' value={totals.units} change={change?.units} />
        <MetricTile
          label='Average order'
          value={formatCurrency(totals.averageOrderValue)}
          change={change?.averageOrderValue}
        />
      </div>

      <Panel title='Revenue over time'>
        <TrendChart series={series} granularity={data.range.granularity} metric='revenue' />
      </Panel>

      <div className='grid gap-5 lg:grid-cols-2'>
        <Panel
          title='Where your orders are'
          aside={
            <Link
              to={ROUTES.DASHBOARD.VENDOR_ORDERS}
              className='text-sm font-medium text-primary-600 hover:text-primary-500'>
              Open orders
            </Link>
          }>
          <StackedBar
            segments={statusSegments(statusBreakdown)}
            total={orderCount}
            emptyLabel='No orders with your products in this period.'
          />
        </Panel>

        <Panel title='Your best sellers'>
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
      </div>

      <div className='grid gap-5 lg:grid-cols-2'>
        {/* Deliberately not windowed: this is the one panel on the page about
            now rather than about the period, and it's the one a vendor can act
            on today. */}
        <Panel
          title='Running low'
          aside={
            <Link
              to={ROUTES.DASHBOARD.VENDOR_PRODUCTS}
              className='text-sm font-medium text-primary-600 hover:text-primary-500'>
              Open products
            </Link>
          }>
          {lowStock.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              Nothing is down to its last few units.
            </p>
          ) : (
            <ul className='divide-y divide-input'>
              {lowStock.map((product) => (
                <li key={product._id} className='flex items-center gap-3 py-2'>
                  {product.thumbnail && (
                    <img
                      src={product.thumbnail}
                      alt=''
                      loading='lazy'
                      className='h-9 w-9 shrink-0 rounded-md object-contain'
                    />
                  )}
                  <span className='min-w-0 flex-1 truncate text-sm text-foreground'>
                    {product.name}
                  </span>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      product.qty === 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}>
                    {product.qty === 0 ? 'Out of stock' : `${product.qty} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title='How your products are rated'>
          {reputation.average === null ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              None of your {reputation.products} products has a review yet.
            </p>
          ) : (
            <>
              <div className='flex items-baseline gap-2'>
                <Star className='h-5 w-5 shrink-0 self-center fill-secondary-400 text-secondary-500' />
                <span className='text-2xl font-semibold tabular-nums text-foreground'>
                  {reputation.average}
                </span>
                <span className='text-sm text-muted-foreground'>
                  across {reputation.reviews} review{reputation.reviews === 1 ? '' : 's'}
                </span>
              </div>
              <p className='mt-3 text-sm text-muted-foreground'>
                {reputation.rated} of your {reputation.products} products have been reviewed.
                Weighted by review count, so one five-star review on a new product doesn't outrank
                two hundred on a bestseller.
              </p>
            </>
          )}
        </Panel>
      </div>

      {topCategories.length > 1 && (
        <Panel title='Your sales by category'>
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
      )}

      <MethodologyNote>
        Your revenue is the full list price of your line items on orders that haven't been
        cancelled or refunded, counted when the order was placed. Promo codes are funded by the
        platform, so a discount the customer received never comes out of your figure — which is why
        these totals can be higher than the order totals an admin sees.
      </MethodologyNote>
    </div>
  );
};

export default VendorAnalytics;
