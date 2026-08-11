import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  ImageOff,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';

import apiClient from '../../api/apiClient.js';
import PaymentReferenceBox from '../../components/account/PaymentReferenceBox.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePrompt } from '../../context/ConfirmContext.js';
import { paymentLabel } from '../../lib/payment.js';

/**
 * Customer order history, following MarketHub's customer Orders screen: status
 * filters across the top, then one collapsed card per order that expands to
 * the line items and the money.
 *
 * Three things it does differently:
 *
 *  - Filtering and paging are the server's job. `GET /users/:id/orders` takes
 *    `status`, `page` and `limit`, and it defaults to **10** — the old page
 *    passed none of them, so a customer with more than ten orders silently saw
 *    only their most recent ten with no hint the rest existed.
 *  - Only the money that exists is rendered. Orders now carry a delivery fee
 *    and, when one was used, a discount with its code — but never tax, which
 *    is always zero on VAT-inclusive prices, so that row would be a confident
 *    zero forever.
 *  - Status carries an icon as well as a colour, so the one order that needs
 *    attention is findable without reading any of them.
 *
 * This page used to be `/account` and also carried an account card (name,
 * email, sign out); all of that is in the header's user menu now.
 */

const PAGE_SIZE = 10;

/**
 * Keyed by the Order schema's status enum. Teal (primary) carries anything in
 * flight, amber (secondary) anything waiting on someone, green a finished
 * order, red a stopped one — the storefront's own accents, so this page reads
 * as part of the same app rather than a generic status palette.
 *
 * The colour lives in the pill and nowhere else. A tinted rail down the card
 * edge said the same thing a second time, in a heavier voice, and a column of
 * them turned a calm list into a stripe of unrelated colours.
 */
const STATUS = {
  pending: {
    label: 'Pending',
    icon: Clock,
    pill: 'bg-secondary-100 text-secondary-800',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    pill: 'bg-primary-100 text-primary-800',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    pill: 'bg-primary-100 text-primary-800',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle2,
    pill: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    pill: 'bg-red-100 text-red-700',
  },
  refunded: {
    label: 'Refunded',
    icon: RotateCcw,
    pill: 'bg-dark-100 text-dark-700',
  },
};

const FALLBACK_STATUS = {
  label: 'Unknown',
  icon: Package,
  pill: 'bg-dark-100 text-dark-700',
};

const statusOf = (status) => STATUS[status] || FALLBACK_STATUS;

const FILTERS = ['all', ...Object.keys(STATUS)];

const PAYMENT_STYLES = {
  paid: 'text-green-700',
  pending: 'text-secondary-700',
  failed: 'text-red-600',
};

// Amounts are stored in whole shillings — checkout posts the cart's own
// figures, not cents. (The `formattedTotal` virtual on the Order schema
// divides by 100 and is wrong for this data; nothing reads it.)
const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

const StatusPill = ({ status }) => {
  const { label, icon: Icon, pill } = statusOf(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill}`}>
      <Icon className='h-3.5 w-3.5' />
      {label}
    </span>
  );
};

const Thumb = ({ src, alt, className = 'h-14 w-14' }) => (
  <div
    className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-dark-200 bg-white`}>
    {src ? (
      <img src={src} alt={alt} loading='lazy' className='h-full w-full object-contain p-1' />
    ) : (
      <ImageOff className='h-4 w-4 text-dark-400' />
    )}
  </div>
);

/**
 * Collapsed, an order is a glance: what state it's in, when, what it looked
 * like, what it cost. The overlapping thumbnails are the fastest way to
 * recognise your own order — people remember what they bought, not the number.
 */
// Only these two can still be stopped — the API refuses the rest, so offering
// the button on a shipped order would be a control that always errors.
const CANCELLABLE = ['pending', 'processing'];

const OrderCard = ({ order, expanded, onToggle, onCancel, cancelling, onPaymentClaim }) => {
  const items = order.items || [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const address = order.shippingAddress;

  // Only the lines that carry a value — see the note at the top of the file.
  // Tax is deliberately absent: every order saves `tax.amount: 0`, because
  // these are VAT-inclusive retail prices, so the row would be a permanent
  // zero. Delivery *is* shown at zero, as "Free" — there it's the point.
  const summary = [
    ['Subtotal', order.subtotal?.amount],
    [
      'Delivery',
      typeof order.shipping?.amount === 'number' ? order.shipping.amount : null,
      order.shipping?.amount === 0 ? 'Free' : null,
    ],
    [
      order.discount?.code ? `Discount (${order.discount.code})` : 'Discount',
      order.discount?.amount ? -order.discount.amount : null,
    ],
  ].filter(([, amount]) => typeof amount === 'number');

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white transition-shadow ${
        expanded ? 'border-primary-200 shadow-md' : 'border-dark-200 hover:shadow-sm'
      }`}>
      <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div className='flex -space-x-3'>
            {items.slice(0, 3).map((item, index) => (
              <Thumb
                key={item.product || index}
                src={item.thumbnail}
                alt={item.name}
                className='h-12 w-12 ring-2 ring-white'
              />
            ))}
            {items.length > 3 && (
              <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dark-200 bg-dark-50 text-xs font-semibold text-dark-600 ring-2 ring-white'>
                +{items.length - 3}
              </span>
            )}
          </div>

          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm font-semibold tabular-nums text-dark-900'>
                {order.orderNumber}
              </span>
              <StatusPill status={order.status} />
            </div>
            <p className='mt-1 truncate text-xs text-dark-500'>
              {formatDate(order.createdAt)} · {itemCount} item{itemCount === 1 ? '' : 's'}
              {items[0]?.name ? ` · ${items[0].name}` : ''}
            </p>
          </div>
        </div>

        <div className='flex items-center justify-between gap-4 sm:justify-end'>
          <div className='sm:text-right'>
            <p className='text-xs text-dark-500'>Total</p>
            {/* Same weight and size as the order number — the two are peers
                on this row, not a headline and a subtitle. */}
            <p className='text-sm font-semibold tabular-nums text-dark-900'>
              {formatKsh(order.total?.amount)}
            </p>
          </div>
          <button
            type='button'
            onClick={onToggle}
            aria-expanded={expanded}
            className='inline-flex items-center gap-1.5 rounded-md border border-dark-300 px-3 py-1.5 text-sm font-semibold text-dark-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'>
            {expanded ? 'Hide' : 'Details'}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className='border-t border-dark-100 bg-dark-50/60 p-4'>
          <div className='divide-y divide-dark-100 overflow-hidden rounded-md border border-dark-200 bg-white'>
            {items.map((item, index) => (
              <div key={item.product || index} className='flex items-center gap-3 p-3'>
                <Thumb src={item.thumbnail} alt={item.name} />
                <div className='min-w-0 flex-1'>
                  {/* The product may since have been delisted, so the link is
                      only offered when the order still carries its id. */}
                  {item.product ? (
                    <Link
                      to={`/product/${item.product}`}
                      className='line-clamp-1 text-sm font-medium text-dark-900 hover:text-primary-700 hover:underline'>
                      {item.name}
                    </Link>
                  ) : (
                    <p className='line-clamp-1 text-sm font-medium text-dark-900'>{item.name}</p>
                  )}
                  <p className='mt-0.5 text-xs text-dark-500'>
                    {item.quantity} × {formatKsh(item.price?.amount)}
                    {item.sku ? ` · ${item.sku}` : ''}
                  </p>
                </div>
                <p className='text-sm font-semibold tabular-nums text-dark-900'>
                  {formatKsh((item.price?.amount || 0) * (item.quantity || 0))}
                </p>
              </div>
            ))}
          </div>

          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='rounded-md border border-dark-200 bg-white p-3 text-sm'>
              {summary.map(([label, amount, override]) => (
                <div key={label} className='flex justify-between text-dark-600'>
                  <span>{label}</span>
                  <span className='tabular-nums'>{override || formatKsh(amount)}</span>
                </div>
              ))}
              <div className='mt-1.5 flex justify-between border-t border-dark-200 pt-1.5 font-bold text-dark-900'>
                <span>Total</span>
                <span className='tabular-nums'>{formatKsh(order.total?.amount)}</span>
              </div>
              {order.payment?.status && (
                <p className='mt-2 flex items-center gap-1.5 text-xs text-dark-500'>
                  <CreditCard className='h-3.5 w-3.5' />
                  <span
                    className={`font-semibold ${
                      PAYMENT_STYLES[order.payment.status] || 'text-dark-600'
                    }`}>
                    {paymentLabel(order.payment.status)}
                  </span>
                  {order.payment.method ? `· ${order.payment.method}` : ''}
                </p>
              )}
            </div>

            {address?.address1 && (
              <div className='rounded-md border border-dark-200 bg-white p-3 text-sm'>
                <p className='mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-dark-500'>
                  <MapPin className='h-3.5 w-3.5' />
                  Delivering to
                </p>
                <p className='font-medium text-dark-900'>
                  {[address.firstName, address.lastName].filter(Boolean).join(' ')}
                </p>
                <p className='text-dark-600'>{address.address1}</p>
                {address.address2 && <p className='text-dark-600'>{address.address2}</p>}
                <p className='text-dark-600'>
                  {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
                </p>
                {address.phone && <p className='text-dark-600'>{address.phone}</p>}
              </div>
            )}
          </div>

          {/* An order can be paid outside the app — M-Pesa to the till, a
              transfer, cash. Nothing tells the server that happened, so this
              is where the customer says so. Hidden once the money is settled
              or the order is off the table. */}
          {order.payment?.status !== 'paid' &&
            order.payment?.status !== 'refunded' &&
            order.status !== 'cancelled' && (
              <PaymentReferenceBox order={order} onUpdated={onPaymentClaim} />
            )}

          {/* Cancelling puts the reserved stock back and releases the promo
              code, so it's a real action rather than a status flag — which is
              why it asks for a reason and confirms first. */}
          {CANCELLABLE.includes(order.status) && (
            <div className='mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dark-200 bg-white p-3'>
              <p className='text-xs text-dark-500'>
                Changed your mind? You can cancel while the order is still
                {order.status === 'pending' ? ' pending' : ' being processed'}.
              </p>
              <button
                type='button'
                onClick={() => onCancel(order)}
                disabled={cancelling}
                className='flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50'>
                <XCircle className='h-4 w-4' />
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            </div>
          )}

          {order.status === 'cancelled' && order.cancellationReason && (
            <p className='mt-3 rounded-md border border-dark-200 bg-white p-3 text-xs text-dark-500'>
              <span className='font-semibold text-dark-700'>Cancelled:</span>{' '}
              {order.cancellationReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const OrdersPage = () => {
  const prompt = usePrompt();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(
    (nextPage, replace) => {
      if (!user?._id) return;
      setLoading(true);
      apiClient
        .get(`/users/${user._id}/orders`, {
          params: {
            page: nextPage,
            limit: PAGE_SIZE,
            ...(status !== 'all' ? { status } : {}),
          },
        })
        .then((res) => {
          const batch = res.data.data || [];
          setOrders((prev) => (replace ? batch : [...prev, ...batch]));
          setTotal(res.data.total || 0);
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load orders'))
        .finally(() => setLoading(false));
    },
    [user?._id, status]
  );

  // Changing the filter restarts paging — appending a filtered page onto an
  // unfiltered list would mix the two.
  useEffect(() => {
    setPage(1);
    setExpandedId(null);
    load(1, true);
  }, [load]);

  const [cancellingId, setCancellingId] = useState(null);

  const cancelOrder = async (order) => {
    // One dialog, not two. The reason is optional, so asking for it in a
    // second box after the confirm read as a step you'd failed to finish —
    // and `null` back from the prompt is a cancel, where an empty string is
    // someone who simply didn't want to say.
    const note = await prompt({
      title: `Cancel order ${order.orderNumber}?`,
      message: 'The items go back on sale and any promo code you used is freed up.',
      label: 'Anything we should know? (optional)',
      placeholder: 'Ordered the wrong size',
      maxLength: 200,
      confirmLabel: 'Cancel this order',
      cancelLabel: 'Keep it',
      tone: 'danger',
    });
    if (note === null) return;

    // Sent as typed — the API stores it on the order and both the admin table
    // and this card read it back.
    const reason = note || 'Cancelled by customer';

    setCancellingId(order._id);
    try {
      const res = await apiClient.post(`/orders/${order._id}/cancel`, { reason });
      // Swap the one row rather than refetching the list: the filter and the
      // pages already loaded should survive a cancellation.
      setOrders((prev) =>
        prev.map((item) => (item._id === order._id ? { ...item, ...res.data.data } : item))
      );
      toast.success('Order cancelled');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not cancel this order');
    } finally {
      setCancellingId(null);
    }
  };

  /**
   * Fold a submitted payment claim back into the loaded row.
   *
   * The same single-row update the cancel button does, and for the same
   * reason: refetching would throw away the filter and every page loaded so
   * far to change one badge.
   */
  const applyPaymentClaim = (orderId) => (verification) =>
    setOrders((prev) =>
      prev.map((item) =>
        item._id === orderId
          ? { ...item, payment: { ...item.payment, verification } }
          : item,
      ),
    );

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, false);
  };

  const isEmpty = !loading && orders.length === 0;

  return (
    <div>
      <div className='mb-5 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='font-heading text-2xl font-bold text-dark-900'>My orders</h1>
          <p className='mt-1 text-sm text-dark-500'>
            {total > 0
              ? `${total} order${total === 1 ? '' : 's'}, most recent first`
              : 'Everything you order will show up here'}
          </p>
        </div>
        <Link
          to='/products'
          className='text-sm font-semibold text-primary-700 hover:underline'>
          Continue shopping →
        </Link>
      </div>

      {/* Horizontally scrollable rather than wrapping: seven chips on a narrow
          phone would otherwise push the first order two rows down. */}
      <div className='-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0'>
        <div className='flex w-max gap-2 sm:w-auto sm:flex-wrap'>
          {FILTERS.map((value) => (
            <button
              key={value}
              type='button'
              onClick={() => setStatus(value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
                status === value
                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                  : 'border-dark-200 bg-white text-dark-600 hover:border-primary-300 hover:text-primary-700'
              }`}>
              {value === 'all' ? 'All' : statusOf(value).label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className='rounded-lg border border-dashed border-dark-300 bg-white py-14 text-center'>
          <div className='mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50'>
            <Package className='h-7 w-7 text-primary-600' />
          </div>
          <p className='mb-1 font-heading font-bold text-dark-900'>
            {status === 'all' ? "You haven't placed any orders yet" : `No ${statusOf(status).label.toLowerCase()} orders`}
          </p>
          <p className='mb-4 text-sm text-dark-500'>
            {status === 'all'
              ? 'Your order history will appear here after your first purchase.'
              : 'Try a different status filter.'}
          </p>
          {status === 'all' ? (
            <Link
              to='/products'
              className='inline-block rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800'>
              Start shopping
            </Link>
          ) : (
            <button
              type='button'
              onClick={() => setStatus('all')}
              className='rounded-md border border-dark-300 px-4 py-2 text-sm font-semibold text-dark-700 hover:bg-dark-50'>
              View all orders
            </button>
          )}
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              expanded={expandedId === order._id}
              onToggle={() => setExpandedId((id) => (id === order._id ? null : order._id))}
              onCancel={cancelOrder}
              cancelling={cancellingId === order._id}
              onPaymentClaim={applyPaymentClaim(order._id)}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className='flex justify-center py-6'>
          <Loader2 className='h-5 w-5 animate-spin text-primary-600' />
          <span className='sr-only'>Loading orders…</span>
        </div>
      )}

      {!loading && orders.length < total && (
        <div className='mt-4 text-center'>
          <button
            type='button'
            onClick={loadMore}
            className='rounded-md border border-dark-300 bg-white px-4 py-2 text-sm font-semibold text-dark-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'>
            Load more ({total - orders.length} left)
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
