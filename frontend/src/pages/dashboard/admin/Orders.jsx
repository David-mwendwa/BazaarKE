import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { ShoppingBag } from 'lucide-react';

import { Card, CardContent } from '../../../components/ui/Card';
import SelectFilter from '../../../components/common/SelectFilter';
import DataTable from '../../../components/common/DataTable';
import ContentSkeleton from '../shared/ContentSkeleton';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import { OrderRef, CustomerCell, ItemsCell, AmountCell, OrderStatusSelect } from '../shared/orderCells.jsx';
import { ORDER_STATUSES, statusChangeDialog } from '../shared/tokens.js';
import { useConfirm } from '../../../context/ConfirmContext.js';

import { ORDER_STATUS_OPTIONS } from '../shared/filterOptions.js';
import apiClient from '../../../api/apiClient.js';


const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);

const AdminOrders = () => {
  const confirm = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [promoFilter, setPromoFilter] = useState('all');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    apiClient
      .get('/orders', { params: { limit: 100 } })
      .then((res) => setOrders(res.data.data || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (order, status) => {
    // Asked before the optimistic write, not after: backing out has to leave
    // the select showing what the order actually is.
    if (!(await confirm(statusChangeDialog(order, status)))) return;

    const previous = order.status;
    setSavingId(order._id);
    // Optimistic: the select should react immediately, and roll back if the
    // request fails rather than leaving the UI out of step with the server.
    setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status } : o)));
    try {
      await apiClient.patch(`/orders/${order._id}`, { status });
      toast.success(`Order ${order.orderNumber} marked ${status}`);
    } catch (err) {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status: previous } : o)));
      toast.error(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setSavingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);
    // "Which orders did WELCOME10 actually bring in, and what did it cost?" —
    // answerable here because `discount.code` is stored on the order. The
    // coupons screen only knows how many times a code was redeemed.
    if (promoFilter === 'any') result = result.filter((o) => o.discount?.code);
    else if (promoFilter === 'none') result = result.filter((o) => !o.discount?.code);
    else if (promoFilter !== 'all') result = result.filter((o) => o.discount?.code === promoFilter);
    return result;
  }, [orders, statusFilter, promoFilter]);

  // Built from the orders in hand, so the dropdown only ever offers codes that
  // were actually used.
  const promoOptions = useMemo(() => {
    const codes = [...new Set(orders.map((o) => o.discount?.code).filter(Boolean))].sort();
    return {
      all: 'All orders',
      any: 'Used a promo code',
      none: 'No promo code',
      ...Object.fromEntries(codes.map((code) => [code, code])),
    };
  }, [orders]);

  const discountTotal = filteredOrders.reduce((sum, o) => sum + (o.discount?.amount || 0), 0);

  const statusControl = (order) => (
    <OrderStatusSelect
      order={order}
      statuses={ORDER_STATUSES}
      saving={savingId === order._id}
      onChange={handleStatusChange}
    />
  );

  // Client-side sorting: columns whose value the key can't reach on its own
  // supply a `sortValue`.
  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      className: 'text-left',
      // Number over date in the cell; date is the useful sort.
      sortValue: (o) => new Date(o.createdAt).getTime(),
      cell: (o) => <OrderRef order={o} />,
    },
    {
      key: 'user',
      header: 'Customer',
      className: 'text-left',
      sortValue: (o) => `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || o.user?.email || '',
      cell: (o) => <CustomerCell order={o} />,
    },
    {
      key: 'items',
      header: 'Items',
      className: 'text-left',
      hideBelow: 'lg',
      sortValue: (o) => (o.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
      cell: (o) => <ItemsCell items={o.items} />,
    },
    {
      key: 'total.amount',
      header: 'Total',
      className: 'text-right',
      cell: (o) => <AmountCell amount={o.total?.amount || 0} paymentStatus={o.payment?.status} />,
    },
    {
      key: 'discount.amount',
      header: 'Promo',
      className: 'text-left',
      hideBelow: 'xl',
      sortValue: (o) => o.discount?.amount || 0,
      cell: (o) =>
        o.discount?.code ? (
          <span className='flex flex-col'>
            <span className='font-mono text-xs font-semibold uppercase text-foreground'>
              {o.discount.code}
            </span>
            <span className='text-xs tabular-nums text-muted-foreground'>
              −{formatKsh(o.discount.amount)}
            </span>
          </span>
        ) : (
          <span className='text-sm text-muted-foreground'>—</span>
        ),
    },
    { key: 'status', header: 'Status', className: 'text-left', sortable: false, cell: statusControl },
  ];

  const mobileCard = (order) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-3'>
        <OrderRef order={order} />
        {statusControl(order)}
      </div>
      <CustomerCell order={order} />
      <div className='flex items-end justify-between gap-3'>
        <ItemsCell items={order.items} />
        <div className='flex flex-col items-end'>
          <AmountCell amount={order.total?.amount || 0} paymentStatus={order.payment?.status} />
          {order.discount?.code && (
            <span className='text-xs text-muted-foreground'>
              {order.discount.code} −{formatKsh(order.discount.amount)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ContentSkeleton showTable rows={8} columns={6} showHeaderSection />;
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Orders'
        description={
          discountTotal > 0
            ? `${filteredOrders.length} shown · ${formatKsh(discountTotal)} discounted`
            : `${orders.length} orders across the platform`
        }>
        <PageHeaderFilters>
          <SelectFilter
            options={ORDER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder='Status'
            icon='SHOPPING_BAG'
            className='h-9 w-full text-sm sm:w-48'
          />
          <SelectFilter
            options={promoOptions}
            value={promoFilter}
            onChange={setPromoFilter}
            placeholder='Promo code'
            icon='TAG'
            className='h-9 w-full text-sm sm:w-48'
          />
        </PageHeaderFilters>
      </PageHeader>

      <Card>
        <CardContent className='p-0'>
          <DataTable
            columns={columns}
            data={filteredOrders}
            mobileCard={mobileCard}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20, 50, 100]}
            emptyState={
              <div className='flex flex-col items-center justify-center gap-3 py-12'>
                <ShoppingBag className='h-10 w-10 text-muted-foreground' />
                <h3 className='font-medium text-foreground'>No orders found</h3>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;
