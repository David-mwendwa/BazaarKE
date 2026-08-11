import { Badge } from '../../../components/ui/Badge';
import { cn, formatCurrency } from '../../../lib/utils';
import { FULFILMENT_STYLES, PAYMENT_STYLES, nextStatuses } from './tokens.js';
import { paymentLabel } from '../../../lib/payment.js';

// Shared cell renderers for the vendor + admin order tables.

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * Order number with its date demoted underneath — the date is context, not
 * something anyone scans a column for, so it doesn't need one of its own.
 */
export const OrderRef = ({ order }) => (
  <div className='flex flex-col'>
    <span className='font-medium tabular-nums text-foreground'>{order.orderNumber}</span>
    <span className='text-xs text-muted-foreground'>{formatDate(order.createdAt)}</span>
  </div>
);

export const CustomerCell = ({ order }) => {
  const user = order.user;
  const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  return (
    <div className='flex min-w-0 flex-col'>
      <span className='line-clamp-1 text-foreground'>{name || user?.email || 'Customer'}</span>
      {name && user?.email && (
        <span className='line-clamp-1 text-xs text-muted-foreground'>{user.email}</span>
      )}
    </div>
  );
};

/**
 * Item count with the first product as a hint. The previous version listed
 * every line item, which made row heights unpredictable and pushed the rest
 * of the table out of view.
 */
export const ItemsCell = ({ items = [] }) => {
  const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const first = items[0];
  const firstName = first?.product?.name || first?.name;

  return (
    <div className='flex min-w-0 flex-col'>
      <span className='text-foreground'>
        {count} {count === 1 ? 'item' : 'items'}
      </span>
      {firstName && (
        <span className='line-clamp-1 text-xs text-muted-foreground'>
          {firstName}
          {items.length > 1 && ` +${items.length - 1} more`}
        </span>
      )}
    </div>
  );
};

/**
 * Amount with payment state underneath. Whether money actually landed is as
 * important as the number itself, and pairing them keeps a whole column back.
 *
 * The label is deliberately not the raw enum: printed as-is it collided with
 * the Status column next to it — "pending" appeared in both, meaning "not yet
 * packed" in one and "not yet paid" in the other. See `PAYMENT_LABELS`.
 */
export const AmountCell = ({ amount, paymentStatus }) => (
  <div className='flex flex-col items-end'>
    <span className='font-medium tabular-nums text-foreground'>{formatCurrency(amount)}</span>
    {paymentStatus && (
      <span className={cn('text-xs', PAYMENT_STYLES[paymentStatus] || 'text-muted-foreground')}>
        {paymentLabel(paymentStatus)}
      </span>
    )}
  </div>
);

/**
 * The status dropdown, shared by the admin and vendor order tables. Which
 * statuses it offers is the caller's decision (`statuses`) — the two roles are
 * allowed different ones, and the API enforces the same split.
 */
export const OrderStatusSelect = ({ order, statuses, saving, onChange }) => {
  // Only where the order can actually go next. The select used to offer every
  // status this role may ever set, so a delivered order could be dropped back
  // to pending and a cancelled one reopened — the API now refuses both, and
  // offering a move that always errors is worse than not offering it.
  const allowed = nextStatuses(order, statuses);
  const settled = allowed.length === 0;

  return (
    <select
      value={order.status}
      disabled={saving || settled}
      // The row itself is clickable in these tables; without this, changing a
      // status would also open the order.
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(order, e.target.value)}
      aria-label={`Status for order ${order.orderNumber}`}
      // A finished order isn't a broken control, so it doesn't get the faded
      // `disabled` look — it keeps its colour and loses the pointer.
      className={cn(
        'rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-medium capitalize',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        settled ? 'cursor-default appearance-none pr-2.5' : 'cursor-pointer',
        saving && 'opacity-50',
        FULFILMENT_STYLES[order.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      )}>
      {/* The order's current status is always listed, even when the role can't
          set it — otherwise a vendor looking at a cancelled order would see the
          select showing "processing". */}
      {[...new Set([order.status, ...allowed])].map((s) => (
        <option key={s} value={s} disabled={!allowed.includes(s)} className='bg-white capitalize text-gray-900'>
          {s}
        </option>
      ))}
    </select>
  );
};

export const FulfilmentBadge = ({ status }) => (
  <Badge
    variant='outline'
    className={cn(
      'whitespace-nowrap border-transparent capitalize',
      FULFILMENT_STYLES[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    )}>
    {status}
  </Badge>
);
