import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { ShoppingBag } from 'lucide-react';

import { Card, CardContent } from '../../../components/ui/Card';
import SelectFilter from '../../../components/common/SelectFilter';
import DataTable from '../../../components/common/DataTable';
import ContentSkeleton from '../shared/ContentSkeleton';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import { OrderRef, CustomerCell, ItemsCell, AmountCell, OrderStatusSelect } from '../shared/orderCells.jsx';

import { ORDER_STATUSES, VENDOR_ORDER_STATUSES, statusChangeDialog } from '../shared/tokens.js';
import { useConfirm } from '../../../context/ConfirmContext.js';
import { ORDER_STATUS_OPTIONS } from '../shared/filterOptions.js';
import apiClient from '../../../api/apiClient.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const VendorOrders = () => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingId, setSavingId] = useState(null);

  /**
   * Marking an order shipped is the one write a vendor needs on this screen,
   * and until now the table was read-only — the API refused everyone but
   * admins, so a vendor could see their orders and do nothing about them.
   *
   * Optimistic, and rolled back on failure, matching the admin table.
   */
  const handleStatusChange = async (order, status) => {
    // Before the optimistic write — a declined confirmation must leave the
    // select showing what the order actually is.
    if (!(await confirm(statusChangeDialog(order, status)))) return;

    const previous = order.status;
    setSavingId(order._id);
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

  const statusControl = (order) => (
    <OrderStatusSelect
      order={order}
      statuses={VENDOR_ORDER_STATUSES}
      saving={savingId === order._id}
      onChange={handleStatusChange}
    />
  );

  useEffect(() => {
    if (!user?._id) return;
    apiClient
      .get(`/orders/vendor/${user._id}`)
      .then((res) => setOrders(res.data.data || []))
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load orders');
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  const filteredOrders = useMemo(
    () => (statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter]
  );

  // The API already strips other vendors' line items and returns a
  // vendor-scoped subtotal, so nothing here has to re-derive it.
  //
  // Sorting is client-side here (no `pagination` prop), so any column whose
  // value the key can't reach on its own supplies a `sortValue`.
  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      className: 'text-left',
      // The cell shows number over date; sorting the pair by date is what
      // anyone actually wants from an order list.
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
      header: 'Your items',
      className: 'text-left',
      hideBelow: 'lg',
      sortValue: (o) => (o.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0),
      cell: (o) => <ItemsCell items={o.items} />,
    },
    {
      key: 'vendorSubtotal.amount',
      header: 'Your total',
      className: 'text-right',
      // What this vendor is paid, which is the full price of their items even
      // when the customer used a promo code — those are platform-funded, and
      // the note below says so wherever one applied, so a vendor comparing
      // this against the customer's total doesn't read it as an error.
      cell: (o) => (
        <div className='flex flex-col items-end'>
          <AmountCell amount={o.vendorSubtotal?.amount || 0} paymentStatus={o.payment?.status} />
          {o.platformDiscount && (
            <span className='text-xs text-muted-foreground'>
              {o.platformDiscount.code} — shop-funded
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-left',
      // Alphabetical would interleave the pipeline (cancelled, delivered,
      // pending, processing…); sorting by lifecycle position keeps the
      // orders that still need work together at one end.
      sortValue: (o) => ORDER_STATUSES.indexOf(o.status),
      sortable: false,
      cell: statusControl,
    },
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
          <AmountCell amount={order.vendorSubtotal?.amount || 0} paymentStatus={order.payment?.status} />
          {order.platformDiscount && (
            <span className='text-xs text-muted-foreground'>
              {order.platformDiscount.code} — shop-funded
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <ContentSkeleton showTable rows={8} columns={5} showHeaderSection />;
  }

  return (
    <div className='space-y-6'>
      <PageHeader title='Orders' description='Orders containing your products'>
        <PageHeaderFilters>
          <SelectFilter
            options={ORDER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder='Status'
            icon='SHOPPING_BAG'
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
                <div>
                  <h3 className='font-medium text-foreground'>No orders yet</h3>
                  <p className='text-sm text-muted-foreground'>
                    {statusFilter === 'all'
                      ? 'Orders containing your products will appear here.'
                      : `No ${statusFilter} orders.`}
                  </p>
                </div>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorOrders;
