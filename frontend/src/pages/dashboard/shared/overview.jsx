import { Link } from 'react-router-dom';

import { Card, CardContent } from '../../../components/ui/UICard';
import { formatCurrency } from '../../../lib/utils';
import { FulfilmentBadge } from './orderCells.jsx';

/**
 * The two dashboard landing pages — vendor and admin — were the same screen
 * written twice: four stat cards over a recent-orders table. Keeping two
 * copies had already cost them a shared idiom, each having grown its own
 * `STATUS_STYLES` map (pending yellow here, amber in every order table the
 * same click leads to) that the shared `FulfilmentBadge` already covered.
 *
 * They differ in exactly two ways, both parameterised below: which stats they
 * count, and whether the order table carries a Product column.
 */

/**
 * A stat is a link only when it leads somewhere. Revenue on both pages used to
 * point at `'#'` while keeping the hover lift and the pointer cursor of its
 * neighbours — a card that invited a click and then scrolled the page to the
 * top. It's rendered flat now, and reads as the summary it is.
 */
export const StatCards = ({ stats }) => (
  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
    {stats.map((stat) => {
      const Icon = stat.icon;

      const card = (
        <Card className={stat.link ? 'h-full' : 'h-full cursor-default'}>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500 dark:text-gray-400'>{stat.name}</p>
                <p className='mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white'>
                  {stat.value}
                </p>
              </div>
              <div className='rounded-lg bg-primary-100 p-3 dark:bg-primary-900/30'>
                <Icon className='h-6 w-6 text-primary-600 dark:text-primary-400' />
              </div>
            </div>
          </CardContent>
        </Card>
      );

      return stat.link ? (
        <Link
          key={stat.name}
          to={stat.link}
          className='block transition-transform hover:scale-[1.02]'>
          {card}
        </Link>
      ) : (
        <div key={stat.name}>{card}</div>
      );
    })}
  </div>
);

const HEAD =
  'px-3 py-3.5 text-left text-sm font-semibold text-gray-900 first:pl-4 last:pr-4 dark:text-white sm:first:pl-6 sm:last:pr-6';
const CELL =
  'whitespace-nowrap px-3 py-4 text-sm text-gray-500 first:pl-4 last:pr-4 dark:text-gray-300 sm:first:pl-6 sm:last:pr-6';

export const RecentOrders = ({ orders, viewAllHref, showProduct = false }) => {
  const columnCount = showProduct ? 5 : 4;

  return (
    <div className='mt-8'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-medium text-gray-900 dark:text-white'>Recent orders</h2>
        <Link
          to={viewAllHref}
          className='text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300'>
          View all orders
        </Link>
      </div>

      <div className='mt-4 overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10'>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-300 dark:divide-gray-600'>
            <thead className='bg-gray-50 dark:bg-gray-700'>
              <tr>
                <th scope='col' className={HEAD}>
                  Order
                </th>
                <th scope='col' className={HEAD}>
                  Customer
                </th>
                {showProduct && (
                  <th scope='col' className={HEAD}>
                    Product
                  </th>
                )}
                <th scope='col' className={`${HEAD} text-right`}>
                  Amount
                </th>
                <th scope='col' className={HEAD}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800'>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className='py-10 text-center text-sm text-gray-500 dark:text-gray-400'>
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className='transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40'>
                    <td
                      className={`${CELL} font-medium tabular-nums text-gray-900 dark:text-white`}>
                      {order.orderNumber}
                    </td>
                    <td className={CELL}>{order.customer}</td>
                    {showProduct && (
                      <td className={`${CELL} max-w-[16rem] truncate`} title={order.product}>
                        {order.product}
                      </td>
                    )}
                    {/* Money right-aligned and tabular, so a column of figures
                        can be compared down its digits rather than read. */}
                    <td className={`${CELL} text-right tabular-nums`}>
                      {formatCurrency(order.amount)}
                    </td>
                    <td className={CELL}>
                      <FulfilmentBadge status={order.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
