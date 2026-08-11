import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, BadgeCheck, Check, Search, ShieldQuestion, X } from 'lucide-react';

import apiClient from '../../../api/apiClient.js';
import DataTable from '../../../components/common/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { cn, formatCurrency } from '../../../lib/utils';
import ContentSkeleton from '../shared/ContentSkeleton';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';

/**
 * ## Payment verification
 *
 * The screen that exists because none of the automated payment paths can be
 * taken at their word. The M-Pesa integration runs against Safaricom's sandbox
 * with `MPESA_SIMULATE_CALLBACK=true` — that sandbox app has no test MSISDN
 * that can approve an STK push, so the callback marking an order paid is one
 * the server fires at itself. Cash on delivery is money handed to a rider.
 * A bank transfer is a line on a statement somebody has to read.
 *
 * So `payment.status: 'paid'` is set here, by a person, against a reference
 * they can point at — and the queue below is everything still waiting for that.
 *
 * Confirming is not the same as fulfilling: an order can be shipped before the
 * money lands (cash on delivery is exactly that), so nothing here touches the
 * fulfilment status beyond nudging a `pending` order to `processing`.
 */

const TABS = [
  {
    id: 'awaiting',
    label: 'Needs a look',
    hint: "Customer references nobody has checked, plus anything a gateway called paid that no person has confirmed.",
  },
  { id: 'submitted', label: 'Customer sent a code', hint: 'Claims waiting on a decision.' },
  {
    id: 'unpaid',
    label: 'No money recorded',
    hint: 'Live orders with nothing received against them yet.',
  },
  { id: 'confirmed', label: 'Confirmed', hint: 'Payments verified by an admin.' },
  { id: 'rejected', label: 'Not found', hint: "References we couldn't match." },
];

const CHANNELS = [
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'other', label: 'Something else' },
];

const METHOD_LABELS = {
  cash_on_delivery: 'Cash on delivery',
  mpesa: 'M-Pesa',
  card: 'Card',
  paypal: 'PayPal',
  bank_transfer: 'Bank transfer',
};

const PAYMENT_TONES = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  authorized: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-KE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/**
 * The decision panel, opened from a row.
 *
 * Inline under the table rather than in a dialog: confirming a payment means
 * reading the reference against a statement in another window, and a modal
 * that owns the screen is the wrong shape for work done half-outside the app.
 */
const ReviewPanel = ({ order, onClose, onDecided }) => {
  const claim = order.payment.verification || {};
  const [reference, setReference] = useState(
    claim.reference || order.payment.transactionId || order.payment.mpesaReceipt || '',
  );
  const [channel, setChannel] = useState(claim.channel || order.payment.method || 'mpesa');
  const [amount, setAmount] = useState(String(order.total));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  const short = Number(amount) > 0 && Number(amount) < order.total;

  const decide = async (decision) => {
    setBusy(decision);
    try {
      const { data } = await apiClient.patch(`/orders/${order._id}/payment/review`, {
        decision,
        reference: reference.trim(),
        channel,
        amountReceived: decision === 'confirm' ? Number(amount) : undefined,
        reviewNote: note.trim(),
      });
      toast.success(data.message);
      onDecided(data.order);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record that decision');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardContent className='space-y-4 p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h3 className='font-semibold text-foreground'>{order.orderNumber}</h3>
            <p className='text-sm text-muted-foreground'>
              {order.customer.name} · {order.customer.email || 'no email on file'} ·{' '}
              {formatCurrency(order.total)} · {METHOD_LABELS[order.payment.method] || order.payment.method}
            </p>
          </div>
          <Button variant='ghost' size='sm' onClick={onClose}>
            Close
          </Button>
        </div>

        {/* What the customer says they did. Shown verbatim and separately from
            the fields below, so the admin can tell their own entry apart from
            the claim they're checking. */}
        {claim.state === 'submitted' && (
          <div className='rounded-md border border-input bg-muted/40 p-3 text-sm'>
            <p className='font-medium text-foreground'>The customer sent:</p>
            <p className='mt-1 font-mono text-foreground'>{claim.reference}</p>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {CHANNELS.find((c) => c.id === claim.channel)?.label || claim.channel} ·{' '}
              {formatDate(claim.submittedAt)}
            </p>
            {claim.payerNote && (
              <p className='mt-2 text-muted-foreground'>“{claim.payerNote}”</p>
            )}
          </div>
        )}

        <div className='grid gap-4 sm:grid-cols-3'>
          <label className='block sm:col-span-1'>
            <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
              Reference
            </span>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder='TIJ4KX9QAB'
              className='h-9 font-mono'
            />
          </label>

          <label className='block'>
            <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
              Came in via
            </span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'>
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
              Amount received
            </span>
            <Input
              type='number'
              min='0'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className='h-9 tabular-nums'
            />
            {/* A short payment is a real thing, so it's allowed — but it has to
                be deliberate, and the customer's email says so too. */}
            {short && (
              <span className='mt-1 block text-xs text-amber-700 dark:text-amber-400'>
                {formatCurrency(order.total - Number(amount))} short of the order total.
              </span>
            )}
          </label>
        </div>

        <label className='block'>
          <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
            Note — the customer reads this, and it's required to reject
          </span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Matched against the till statement for 14:22.'
            className='h-9'
          />
        </label>

        <div className='flex flex-wrap justify-end gap-2'>
          <Button
            variant='outline'
            className='border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
            disabled={busy !== null}
            onClick={() => decide('reject')}>
            <X className='mr-2 h-4 w-4' />
            {busy === 'reject' ? 'Saving…' : "Couldn't find it"}
          </Button>
          <Button disabled={busy !== null} onClick={() => decide('confirm')}>
            <Check className='mr-2 h-4 w-4' />
            {busy === 'confirm' ? 'Saving…' : 'Confirm payment'}
          </Button>
        </div>

        <p className='text-xs text-muted-foreground'>
          Confirming marks the order paid and emails the customer. Rejecting leaves the order open
          — nothing is cancelled and no stock is released.
        </p>
      </CardContent>
    </Card>
  );
};

const AdminPayments = () => {
  const [tab, setTab] = useState('awaiting');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ submitted: 0, unpaid: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(
    (page = 1) =>
      apiClient
        .get('/admin/payments', { params: { state: tab, search, page, limit: 20 } })
        .then((res) => {
          setOrders(res.data.orders || []);
          setCounts(res.data.counts || { submitted: 0, unpaid: 0 });
          setPagination(res.data.pagination);
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load payments')),
    [tab, search],
  );

  useEffect(() => {
    setLoading(true);
    // Debounced, because this runs on every keystroke in the search box and
    // the query behind it scans orders.
    const timer = setTimeout(() => {
      load().finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const onDecided = () => {
    setReviewing(null);
    load(pagination.page);
  };

  const orderCell = (row) => (
    <div className='flex min-w-0 flex-col'>
      <span className='font-medium tabular-nums text-foreground'>{row.orderNumber}</span>
      <span className='truncate text-xs text-muted-foreground'>
        {row.customer.name} · {row.itemCount} item{row.itemCount === 1 ? '' : 's'}
      </span>
    </div>
  );

  const amountCell = (row) => (
    <span className='text-sm font-medium tabular-nums text-foreground'>
      {formatCurrency(row.total)}
    </span>
  );

  const methodCell = (row) => (
    <div className='flex min-w-0 flex-col'>
      <span className='text-sm text-foreground'>
        {METHOD_LABELS[row.payment.method] || row.payment.method}
      </span>
      <Badge
        variant='outline'
        className={cn(
          'mt-1 w-fit border-transparent text-xs',
          PAYMENT_TONES[row.payment.status] || PAYMENT_TONES.pending,
        )}>
        {row.payment.status}
      </Badge>
    </div>
  );

  /**
   * The column the whole screen is about: has a person checked this, and what
   * did they find. Deliberately distinct from the payment-status badge next to
   * it — a gateway saying "paid" and a human saying "I saw the money" are two
   * different claims, and collapsing them is what made this screen necessary.
   */
  const checkCell = (row) => {
    const v = row.payment.verification || { state: 'none' };

    if (v.state === 'confirmed') {
      return (
        <span className='flex min-w-0 flex-col'>
          <span className='flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400'>
            <BadgeCheck className='h-4 w-4' />
            Confirmed
          </span>
          <span className='truncate font-mono text-xs text-muted-foreground'>{v.reference}</span>
        </span>
      );
    }
    if (v.state === 'rejected') {
      return (
        <span className='flex min-w-0 flex-col'>
          <span className='flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400'>
            <AlertTriangle className='h-4 w-4' />
            Not found
          </span>
          <span className='truncate text-xs text-muted-foreground'>{v.reviewNote}</span>
        </span>
      );
    }
    if (v.state === 'submitted') {
      return (
        <span className='flex min-w-0 flex-col'>
          <span className='text-sm font-medium text-amber-700 dark:text-amber-400'>
            Customer sent a code
          </span>
          <span className='truncate font-mono text-xs text-muted-foreground'>{v.reference}</span>
        </span>
      );
    }
    return <span className='text-sm text-muted-foreground'>Not checked</span>;
  };

  const columns = [
    { key: 'orderNumber', header: 'Order', className: 'text-left', cell: orderCell },
    {
      key: 'total',
      header: 'Amount',
      className: 'text-left',
      cell: amountCell,
      sortValue: (row) => row.total,
    },
    { key: 'method', header: 'Method', className: 'text-left', cell: methodCell, sortable: false },
    { key: 'check', header: 'Checked', className: 'text-left', cell: checkCell, sortable: false },
    {
      key: 'createdAt',
      header: 'Placed',
      className: 'text-left',
      hideBelow: 'lg',
      cell: (row) => (
        <span className='text-sm text-muted-foreground'>{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      className: 'sticky text-right',
      cell: (row) => (
        <Button
          size='sm'
          variant={row.payment.verification?.state === 'submitted' ? 'default' : 'outline'}
          onClick={() => setReviewing(row)}>
          Review
        </Button>
      ),
    },
  ];

  const mobileCard = (row) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-2'>
        {orderCell(row)}
        {amountCell(row)}
      </div>
      <div className='flex items-center justify-between gap-2'>
        {methodCell(row)}
        {checkCell(row)}
      </div>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs text-muted-foreground'>{formatDate(row.createdAt)}</span>
        <Button size='sm' variant='outline' onClick={() => setReviewing(row)}>
          Review
        </Button>
      </div>
    </div>
  );

  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Payments'
        description='Confirm that money actually arrived, against a reference you can point at.'>
        <PageHeaderFilters>
          <div className='relative w-full sm:max-w-xs'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Order number, email or reference…'
              className='h-9 w-full pl-10'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </PageHeaderFilters>
      </PageHeader>

      {/* Tabs rather than a select: these are five queues with different sizes
          and different urgency, and the two that need action carry counts. A
          dropdown hides both facts behind a click. */}
      <div className='flex flex-wrap gap-2'>
        {TABS.map((t) => {
          const count = t.id === 'submitted' ? counts.submitted : t.id === 'unpaid' ? counts.unpaid : null;
          return (
            <button
              key={t.id}
              type='button'
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'border-input text-muted-foreground hover:text-foreground',
              )}>
              {t.label}
              {count > 0 && (
                <span className='rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white'>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab?.hint && <p className='-mt-3 text-sm text-muted-foreground'>{activeTab.hint}</p>}

      {reviewing && (
        <ReviewPanel
          order={reviewing}
          onClose={() => setReviewing(null)}
          onDecided={onDecided}
        />
      )}

      {loading ? (
        <ContentSkeleton showTable rows={6} columns={5} />
      ) : (
        <Card>
          <CardContent className='p-0'>
            <DataTable
              columns={columns}
              data={orders}
              mobileCard={mobileCard}
              pagination={{
                page: pagination.page,
                pageSize: 20,
                totalItems: pagination.total,
                totalPages: pagination.pages,
                onPageChange: load,
              }}
              emptyState={
                <div className='flex flex-col items-center justify-center gap-3 py-12'>
                  <ShieldQuestion className='h-10 w-10 text-muted-foreground' />
                  <h3 className='font-medium text-foreground'>Nothing in this queue</h3>
                  <p className='max-w-sm text-center text-sm text-muted-foreground'>
                    {tab === 'awaiting'
                      ? 'Every payment that needed a person has had one.'
                      : 'No orders match this filter.'}
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPayments;
