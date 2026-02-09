import React, { useState, useMemo, memo, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OrderContext } from '../../../contexts/OrderContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '../../../components/ui/UICard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { ICONS } from '../../../constants/icons';
import * as LucideIcons from 'lucide-react';
import DataTable from '../../../components/common/DataTable';
import { formatCurrency, formatDate, cn } from '../../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../../../components/ui/DropdownMenu';
import SelectFilter from '../../../components/common/SelectFilter';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/Tabs';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/Tooltip';
import {
  Calendar as CalendarIcon,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  MoreHorizontal,
  Eye,
  FileText,
  Mail,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle,
  X,
  XCircle,
  Clock,
  Truck,
  Package,
  Check,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Wallet,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import {
  addDays,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { Calendar } from '../../../components/ui/Calendar';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import { PageHeader } from '../shared/PageHeader';
import ContentSkeleton from '../shared/ContentSkeleton';

// Payment method configuration
const paymentMethods = [
  { value: 'all', label: 'All Payments' },
  { value: 'credit_card', label: 'Credit Card', icon: 'CREDIT_CARD' },
  { value: 'paypal', label: 'PayPal', icon: 'DOLLAR_SIGN' },
  { value: 'mpesa', label: 'Mpesa', icon: 'CREDIT_CARD' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'BANKNOTE' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: 'WALLET' },
  { value: 'other', label: 'Other', icon: 'CREDIT_CARD' },
];

// Payment method helpers
const getPaymentMethodLabel = (method) => {
  if (method === 'all') return 'All Payments';
  const payment = paymentMethods.find((m) => m.value === method);
  return payment ? payment.label : method;
};

const getPaymentMethodIcon = (method) => {
  if (method === 'all') return null;
  const payment = paymentMethods.find((m) => m.value === method);
  if (!payment) return <CreditCard className='h-4 w-4 mr-2' />;

  const iconMap = {
    CREDIT_CARD: <CreditCard className='h-4 w-4 mr-2' />,
    DOLLAR_SIGN: <DollarSign className='h-4 w-4 mr-2 text-blue-500' />,
    BANKNOTE: <CreditCard className='h-4 w-4 mr-2 text-green-500' />,
    WALLET: <Wallet className='h-4 w-4 mr-2 text-gray-500' />,
  };

  return iconMap[payment.icon] || <CreditCard className='h-4 w-4 mr-2' />;
};

// Status options for the filter
const statusOptions = [
  { value: 'all', label: 'All Orders', icon: 'LIST_ORDERED' },
  { value: 'pending', label: 'Pending', icon: 'CLOCK' },
  { value: 'processing', label: 'Processing', icon: 'REFRESH_CW' },
  { value: 'shipped', label: 'Shipped', icon: 'TRUCK' },
  { value: 'completed', label: 'Completed', icon: 'CHECK_CIRCLE' },
  { value: 'cancelled', label: 'Cancelled', icon: 'X_CIRCLE' },
  { value: 'refunded', label: 'Refunded', icon: 'REPEAT' },
];

// Payment filter options
const paymentFilterOptions = [
  { value: 'all', label: 'All Payments' },
  { value: 'credit_card', label: 'Credit Card', icon: 'CREDIT_CARD' },
  { value: 'paypal', label: 'PayPal', icon: 'DOLLAR_SIGN' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'BANKNOTE' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: 'WALLET' },
];

// Date range presets
const dateRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7' },
  { label: 'Last 30 days', value: 'last30' },
  { label: 'This month', value: 'thisMonth' },
  { label: 'Last month', value: 'lastMonth' },
  { label: 'Custom range', value: 'custom' },
];

// Create a mapping of icon names to their Lucide components
const Icon = ({ name, ...props }) => {
  const LucideIcon = LucideIcons[ICONS[name]] || LucideIcons['HelpCircle'];
  return <LucideIcon {...props} />;
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    fetchVendorOrders,
  } = useContext(OrderContext);

  // State for data and loading - sync with context
  const [isLoading, setIsLoading] = useState(ordersLoading);
  const [error, setError] = useState(ordersError);

  // Sync loading and error states with context
  useEffect(() => {
    setIsLoading(ordersLoading);
  }, [ordersLoading]);

  useEffect(() => {
    setError(ordersError);
  }, [ordersError]);

  // Fetch vendor orders when component mounts or user changes
  useEffect(() => {
    const userId = user?.user?._id || user?._id;
    if (userId) {
      fetchVendorOrders(userId);
    }
  }, [user, fetchVendorOrders]);

  // State for filters and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    payment: 'all',
    dateRange: 'last30',
  });
  const [dateRange, setDateRange] = useState({
    from: null, // Start with no date filter to show all orders
    to: null,
  });
  const [selectedDateRange, setSelectedDateRange] = useState('last30');
  const [selectedRows, setSelectedRows] = useState([]);

  // Orders are fetched via context, no need for separate fetch here

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    filters.status !== 'all' ||
    filters.payment !== 'all' ||
    selectedDateRange !== 'last30';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      status: 'all',
      payment: 'all',
      dateRange: 'last30',
    });
    setSelectedDateRange('last30');
    setDateRange({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  };

  // Handle filter changes
  const handleStatusFilter = (value) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handlePaymentFilter = (value) => {
    setFilters((prev) => ({ ...prev, payment: value }));
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setSelectedDateRange(range);

    // Update the actual date range based on the selected range
    if (range === 'today') {
      setDateRange({
        from: new Date(),
        to: new Date(),
      });
    } else if (range === 'yesterday') {
      const yesterday = subDays(new Date(), 1);
      setDateRange({
        from: yesterday,
        to: yesterday,
      });
    } else if (range === 'last7') {
      setDateRange({
        from: subDays(new Date(), 6),
        to: new Date(),
      });
    } else if (range === 'last30') {
      setDateRange({
        from: subDays(new Date(), 29),
        to: new Date(),
      });
    } else if (range === 'thisMonth') {
      const now = new Date();
      setDateRange({
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
      });
    } else if (range === 'lastMonth') {
      const now = new Date();
      const firstDayLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateRange({
        from: firstDayLastMonth,
        to: lastDayLastMonth,
      });
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Format date range for display
  const formatDateRange = (date) => {
    if (!date) return '';
    return formatDate(date, 'MMM d, yyyy');
  };

  // Calculate order statistics
  const orderStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        conversionRate: '0%',
      };
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      const total =
        order.total?.amount || order.totalAmount || order.total || 0;
      // Convert from cents to currency units if needed (divide by 100)
      return sum + (typeof total === 'number' ? total : 0);
    }, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = orders.filter(
      (order) => order.status === 'pending',
    ).length;
    const completedOrders = orders.filter(
      (order) => order.status === 'completed',
    ).length;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      pendingOrders,
      completedOrders,
      conversionRate: '2.5%', // This would come from analytics in a real app
    };
  }, [orders]);

  // Filter orders based on search, status, payment, and date range
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    return orders.filter((order) => {
      if (!order) return false;

      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.customer?.email
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (typeof order.customer === 'string' &&
          order.customer.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        filters.status === 'all' || order.status === filters.status;

      // Payment filter - handle nested payment object
      const paymentMethod =
        order.payment?.method || order.paymentMethod || order.payment;
      const matchesPayment =
        filters.payment === 'all' || paymentMethod === filters.payment;

      // Date range filter - only filter if date range is set
      const orderDate = order.createdAt
        ? new Date(order.createdAt)
        : order.date
          ? new Date(order.date)
          : null;
      let matchesDateRange = true; // Default to true (show all orders if no date filter)

      if (dateRange.from && dateRange.to && orderDate) {
        // Reset time to start/end of day for proper comparison
        const orderDateOnly = new Date(orderDate);
        orderDateOnly.setHours(0, 0, 0, 0);

        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);

        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);

        matchesDateRange = orderDateOnly >= fromDate && orderDateOnly <= toDate;
      }

      const matches =
        matchesSearch && matchesStatus && matchesPayment && matchesDateRange;

      // Debug first order to see what's happening
      if (orders.indexOf(order) === 0) {
        console.log('First order filter check:', {
          orderNumber: order.orderNumber,
          orderDate: orderDate,
          dateRange,
          matchesSearch,
          matchesStatus,
          matchesPayment,
          matchesDateRange,
          matches,
        });
      }

      return matches;
    });
  }, [searchQuery, filters, dateRange, orders]);

  // Log the orders to see the structure
  useEffect(() => {
    console.log('Orders from context:', orders);
    console.log('Orders count:', orders?.length);
    console.log('Filtered orders count:', filteredOrders?.length);
    if (filteredOrders?.length > 0) {
      console.log('First filtered order:', filteredOrders[0]);
    }
  }, [orders, filteredOrders]);

  // Handle row selection
  const handleRowSelect = (row, isSelected) => {
    const rowId = row.original?._id || row.original?.id || row.id;
    if (isSelected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter((id) => id !== rowId));
    }
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedRows(filteredOrders.map((row) => row._id || row.id));
    } else {
      setSelectedRows([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      switch (action) {
        case 'mark_as_paid':
          // Update orders status to paid
          toast.success(`${selectedRows.length} orders marked as paid.`);
          break;

        case 'update_status':
          // Update orders status
          toast.success(`Status updated for ${selectedRows.length} orders.`);
          break;

        case 'export':
          // Export orders
          toast.info(`Preparing export for ${selectedRows.length} orders...`);
          break;

        case 'delete':
          // Delete orders
          toast.success(`${selectedRows.length} orders have been deleted.`);
          setSelectedRows([]);
          break;
      }

      // Bulk action completed
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('An error occurred while processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge with consistent styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        color:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      processing: {
        label: 'Processing',
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      },
      shipped: {
        label: 'Shipped',
        color:
          'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      },
      completed: {
        label: 'Completed',
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
      refunded: {
        label: 'Refunded',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      },
    };

    const config = statusConfig[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {status === 'shipped' && <Truck className='h-3 w-3 mr-1.5' />}
        {status === 'completed' && <CheckCircle className='h-3 w-3 mr-1.5' />}
        {status === 'cancelled' && <XCircle className='h-3 w-3 mr-1.5' />}
        {status === 'pending' && <Clock className='h-3 w-3 mr-1.5' />}
        {config.label}
      </Badge>
    );
  };

  // Get payment badge with consistent styling
  const getPaymentBadge = (paymentMethod) => {
    const paymentConfig = {
      credit_card: {
        label: 'Credit Card',
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      },
      paypal: {
        label: 'PayPal',
        color:
          'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      },
      bank_transfer: {
        label: 'Bank Transfer',
        color:
          'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      },
      cash_on_delivery: {
        label: 'Cash on Delivery',
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      },
    };

    const config = paymentConfig[paymentMethod] || {
      label: paymentMethod,
      color: 'bg-gray-100 text-gray-800',
    };

    return (
      <div className='flex items-center'>
        {getPaymentMethodIcon(paymentMethod)}
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            config.color,
          )}>
          {config.label}
        </span>
      </div>
    );
  };

  // Columns configuration for the orders table
  // Note: DataTable automatically adds a checkbox column when enableRowSelection is true
  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      accessorKey: 'orderNumber',
      sortValue: (row) => row.orderNumber || row._id || '',
      cell: (row) => {
        const order = row;
        const customer = order.user || order.customer;
        const customerName =
          customer?.name ||
          customer?.email ||
          (typeof customer === 'string' ? customer : 'N/A');
        return (
          <div className='font-medium'>
            <div>{order.orderNumber || order._id || 'N/A'}</div>
            <div className='text-xs text-gray-500'>{customerName}</div>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      accessorKey: 'createdAt',
      sortValue: (row) => {
        const date = row.createdAt || row.date;
        return date ? new Date(date).getTime() : 0;
      },
      cell: (row) => {
        const date = row.createdAt || row.date;
        return date ? formatDate(date, 'MMM D, YYYY') : 'N/A';
      },
    },
    {
      key: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortValue: (row) => row.status || '',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      key: 'total',
      header: 'Total',
      accessorKey: 'total.amount',
      sortValue: (row) => {
        const totalAmount =
          row.total?.amount || row.totalAmount || row.total || 0;
        // Convert from cents if needed
        return totalAmount > 1000 && totalAmount % 100 === 0
          ? totalAmount / 100
          : totalAmount;
      },
      cell: (row) => {
        const order = row;
        // Handle nested total object or direct value
        const totalAmount =
          order.total?.amount || order.totalAmount || order.total || 0;
        // If amount is in cents (like 17023), convert to currency units
        // Check if it's likely in cents (amount > 1000 and no decimal)
        const displayAmount =
          totalAmount > 1000 && totalAmount % 100 === 0
            ? totalAmount / 100
            : totalAmount;
        return formatCurrency(displayAmount);
      },
    },
    {
      key: 'items',
      header: 'Items',
      accessorKey: 'items',
      sortValue: (row) => row.items?.length || 0,
      cell: (row) => {
        const order = row;
        const itemsCount = order.items?.length || 0;
        return (
          <div className='flex items-center gap-2'>
            <Package className='h-4 w-4 text-muted-foreground' />
            <span className='font-medium'>{itemsCount}</span>
            <span className='text-sm text-muted-foreground'>
              {itemsCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'payment',
      header: 'Payment',
      accessorKey: 'payment.method',
      sortValue: (row) => {
        return (
          row.payment?.method ||
          row.paymentMethod ||
          row.payment ||
          'unknown'
        );
      },
      cell: (row) => {
        const order = row;
        // Handle nested payment object
        const paymentMethod =
          order.payment?.method ||
          order.paymentMethod ||
          order.payment ||
          'unknown';
        return <span>{getPaymentMethodLabel(paymentMethod)}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      className: 'sticky right-0',
      cell: (row) => {
        const order = row;
        return (
          <div className='flex justify-end'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
                  onClick={(e) => {
                    e.stopPropagation();
                  }}>
                  <MoreHorizontal className='h-4 w-4' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-40'>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/vendor/orders/${order._id || order.id}`);
                  }}
                  className='cursor-pointer'>
                  <Eye className='mr-2 h-4 w-4' />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className='cursor-pointer'
                  onClick={(e) => {
                    e.stopPropagation();
                  }}>
                  <FileText className='mr-2 h-4 w-4' />
                  View Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='cursor-pointer text-destructive focus:text-destructive'
                  onClick={(e) => {
                    e.stopPropagation();
                  }}>
                  <Trash2 className='mr-2 h-4 w-4' />
                  Cancel Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      width: 80,
    },
  ];

  if (isLoading) {
    return (
      <ContentSkeleton
        showTable={true}
        rows={10}
        columns={8}
        hasCheckboxes={true}
        hasActions={true}
        showHeaderSection={true}
      />
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <PageHeader
        title='Orders'
        description='Manage and track customer orders'
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        selectedCount={selectedRows.length}
        onClearSelection={() => setSelectedRows([])}
        onBulkAction={handleBulkAction}
        bulkActions={[
          {
            value: 'mark_as_paid',
            label: 'Mark as Paid',
            icon: CheckCircle,
          },
          {
            value: 'update_status',
            label: 'Update Status',
            icon: RefreshCw,
          },
          {
            value: 'export',
            label: 'Export Selected',
            icon: Download,
          },
          {
            value: 'delete',
            label: 'Delete Selected',
            icon: Trash2,
            destructive: true,
          },
        ]}>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search by order ID, customer, email...'
              className='w-full pl-10 h-9'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <SelectFilter
              options={statusOptions}
              value={filters.status}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
              placeholder='Status'
              icon='LIST_ORDERED'
              className='h-9 text-sm'
            />
            <SelectFilter
              options={paymentMethods}
              value={filters.payment}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, payment: value }))
              }
              placeholder='Payment'
              icon='CREDIT_CARD'
              className='h-9 text-sm'
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='h-9'>
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-auto p-0' align='end'>
                <Calendar
                  initialFocus
                  mode='range'
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </PageHeader>

      {/* DataTable */}
      <Card>
        <CardContent className='p-0'>
          <DataTable
            columns={columns}
            data={filteredOrders}
            isLoading={isLoading}
            enableRowSelection={true}
            selectedRows={selectedRows}
            onSelectRow={(rowId, selected) => {
              if (selected) {
                setSelectedRows((prev) => [...prev, rowId]);
              } else {
                setSelectedRows((prev) => prev.filter((id) => id !== rowId));
              }
            }}
            onSelectAll={(selected) => {
              if (selected) {
                // Select all filtered orders
                const allIds = filteredOrders.map((row) => row._id || row.id);
                setSelectedRows((prev) => [...new Set([...prev, ...allIds])]);
              } else {
                // Deselect all filtered orders
                const allIds = filteredOrders.map((row) => row._id || row.id);
                setSelectedRows((prev) =>
                  prev.filter((id) => !allIds.includes(id)),
                );
              }
            }}
            emptyState={
              <div className='flex flex-col items-center justify-center py-12'>
                <Package className='h-12 w-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-medium mb-1'>No orders found</h3>
                <p className='text-sm text-muted-foreground mb-4'>
                  {searchQuery ||
                  filters.status !== 'all' ||
                  filters.payment !== 'all'
                    ? 'No orders match your current filters'
                    : 'New orders will appear here when customers place them'}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
