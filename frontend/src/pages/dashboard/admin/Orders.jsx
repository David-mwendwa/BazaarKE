import React, { useState, useMemo, memo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { ICONS } from '@/constants/icons';
import * as LucideIcons from 'lucide-react';
import DataTable from '@components/common/DataTable';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@components/ui/DropdownMenu';
import SelectFilter from '@components/common/SelectFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@components/ui/Tooltip';
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
import { Calendar } from '@components/ui/Calendar';
import ErrorBoundary from '@components/common/ErrorBoundary';
import { PageHeader } from '@pages/dashboard/shared/PageHeader';
import ContentSkeleton from '@pages/dashboard/shared/ContentSkeleton';

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
  // Using react-toastify directly for notifications

  // State for data and loading
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filters and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    payment: 'all',
    dateRange: 'last30',
  });
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 29), // Last 30 days (inclusive)
    to: new Date(),
  });
  const [selectedDateRange, setSelectedDateRange] = useState('last30');
  const [selectedRows, setSelectedRows] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Set your orders data here
        // setOrders(mockOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

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
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle filter changes
  const handleStatusFilter = (value) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handlePaymentFilter = (value) => {
    setFilters((prev) => ({ ...prev, payment: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle date range change
  const handleDateRangeChange = (range) => {
    setSelectedDateRange(range);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));

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
        1
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
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = orders.filter(
      (order) => order.status === 'pending'
    ).length;
    const completedOrders = orders.filter(
      (order) => order.status === 'completed'
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
        !searchQuery ||
        (order.id &&
          order.id
            .toString()
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (order.customer &&
          order.customer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.email &&
          order.email.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        !filters.status ||
        filters.status === 'all' ||
        order.status === filters.status;

      // Payment filter
      const matchesPayment =
        !filters.payment ||
        filters.payment === 'all' ||
        order.payment === filters.payment;

      // Date range filter
      let matchesDateRange = true;
      if (order.date) {
        const orderDate = new Date(order.date);
        matchesDateRange =
          (!dateRange.from || orderDate >= dateRange.from) &&
          (!dateRange.to ||
            orderDate <= new Date(dateRange.to.setHours(23, 59, 59, 999)));
      }

      return (
        matchesSearch && matchesStatus && matchesPayment && matchesDateRange
      );
    });
  }, [orders, searchQuery, filters.status, filters.payment, dateRange]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.pageIndex - 1) * pagination.pageSize;
    return filteredOrders.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredOrders, pagination]);

  const totalPages = Math.ceil(filteredOrders.length / pagination.pageSize);

  // Handle row selection
  const handleRowSelect = (row, isSelected) => {
    if (isSelected) {
      setSelectedRows([...selectedRows, row.id]);
    } else {
      setSelectedRows(selectedRows.filter((id) => id !== row.id));
    }
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedRows(paginatedData.map((row) => row.id));
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

      // Close bulk actions menu
      setIsBulkActionOpen(false);
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
        {status === 'processing' && (
          <RefreshCw className='h-3 w-3 mr-1.5 animate-spin' />
        )}
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
            config.color
          )}>
          {config.label}
        </span>
      </div>
    );
  };

  // Define columns for DataTable
  const columns = [
    {
      key: 'id',
      header: 'Order',
      cell: (row) => (
        <div className='flex flex-col'>
          <Link
            to={`/dashboard/orders/${row.id}`}
            className='font-medium text-foreground hover:underline inline-flex items-center'
            onClick={(e) => e.stopPropagation()}>
            {row.id}
            <FileText className='h-3.5 w-3.5 ml-1.5 text-muted-foreground' />
          </Link>
          <span className='text-xs text-muted-foreground'>
            {row.formattedDate}
          </span>
        </div>
      ),
      sortable: true,
      width: 180,
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className='flex items-center'>
          <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium mr-2'>
            {row.customer.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className='font-medium text-foreground'>{row.customer}</div>
            <div className='text-xs text-muted-foreground'>{row.email}</div>
          </div>
        </div>
      ),
      sortable: true,
      width: 220,
    },
    {
      key: 'products',
      header: 'Products',
      cell: (row) => (
        <div className='flex -space-x-2'>
          {row.products?.slice(0, 3).map((product, idx) => (
            <div key={idx} className='relative'>
              <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-background'>
                {product.name.charAt(0).toUpperCase()}
                {product.quantity > 1 && (
                  <span className='absolute -top-1 -right-1 bg-primary text-white text-[10px] h-4 w-4 rounded-full flex items-center justify-center'>
                    {product.quantity}
                  </span>
                )}
              </div>
            </div>
          ))}
          {row.products?.length > 3 && (
            <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border-2 border-background'>
              +{row.products.length - 3}
            </div>
          )}
        </div>
      ),
      width: 140,
    },
    {
      key: 'total',
      header: 'Total',
      cell: (row) => (
        <div>
          <div className='font-medium text-foreground'>
            {row.formattedTotal}
          </div>
          <div className='text-xs text-muted-foreground'>{row.itemsText}</div>
        </div>
      ),
      sortable: true,
      width: 100,
    },
    {
      key: 'payment',
      header: 'Payment',
      cell: (row) => {
        const badge = getPaymentBadge(row.payment);
        return React.isValidElement(badge) ? (
          badge
        ) : (
          <span>{JSON.stringify(badge)}</span>
        );
      },
      sortable: true,
      width: 150,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const badge = getStatusBadge(row.status);
        return React.isValidElement(badge) ? (
          badge
        ) : (
          <span>{JSON.stringify(badge)}</span>
        );
      },
      sortable: true,
      width: 130,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <OrderActions
          orderId={row.id}
          status={row.status}
          onStatusChange={(newStatus) => {
            // Update the status in the local state
            const updatedData = orders.map((order) =>
              order.id === row.id ? { ...order, status: newStatus } : order
            );
            setOrders(updatedData);
            // In a real app, you would also update the data source here
            console.log(`Order ${row.id} status updated to ${newStatus}`);
          }}
        />
      ),
      width: 60,
    },
  ];

  // Order Actions Component
  const OrderActions = memo(({ orderId, status: initialStatus }) => {
    const [status, setStatus] = useState(initialStatus);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleStatusChange = (newStatus) => {
      setStatus(newStatus);
      // Update order status in the backend
      // updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
    };

    return (
      <div className='flex items-center justify-end space-x-1'>
        {/* View Details */}
        <Link
          to={`/dashboard/orders/${orderId}`}
          className='p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors'
          title='View details'
          onClick={(e) => e.stopPropagation()}>
          <Icon name='EYE' className='h-4 w-4' />
          <span className='sr-only'>View details</span>
        </Link>

        {/* Status Dropdown */}
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className='p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors'
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              title='Change status'>
              <Icon name='CHECK_CIRCLE' className='h-4 w-4' />
              <span className='sr-only'>Change status</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuItem onClick={() => handleStatusChange('pending')}>
              <span className='w-2 h-2 rounded-full bg-yellow-500 mr-2' />
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('processing')}>
              <span className='w-2 h-2 rounded-full bg-blue-500 mr-2' />
              Processing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('shipped')}>
              <span className='w-2 h-2 rounded-full bg-purple-500 mr-2' />
              Shipped
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('delivered')}>
              <span className='w-2 h-2 rounded-full bg-green-500 mr-2' />
              Delivered
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleStatusChange('cancelled')}
              className='text-destructive focus:text-destructive'>
              <span className='w-2 h-2 rounded-full bg-red-500 mr-2' />
              Cancel Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className='p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors'
              onClick={(e) => e.stopPropagation()}
              title='More actions'>
              <Icon name='MORE_VERTICAL' className='h-4 w-4' />
              <span className='sr-only'>More actions</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            <DropdownMenuItem asChild>
              <Link
                to={`/dashboard/orders/${orderId}/invoice`}
                className='w-full'>
                <Icon name='PRINTER' className='mr-2 h-4 w-4' />
                Print Invoice
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Icon name='DOWNLOAD' className='mr-2 h-4 w-4' />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Icon name='MAIL' className='mr-2 h-4 w-4' />
              Resend Confirmation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Icon name='REFRESH_CW' className='mr-2 h-4 w-4' />
              Process Refund
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Icon name='MESSAGE_SQUARE' className='mr-2 h-4 w-4' />
              Contact Customer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className='text-destructive focus:text-destructive'>
              <Icon name='TRASH' className='mr-2 h-4 w-4' />
              Delete Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  });

  OrderActions.displayName = 'OrderActions';

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
                <Button
                  variant='outline'
                  size='sm'
                  className='h-9 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700 dark:focus-visible:ring-gray-400'>
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
            data={paginatedData}
            isLoading={isLoading}
            pageCount={totalPages}
            pageIndex={pagination.pageIndex}
            onPageChange={(pageIndex) =>
              setPagination((prev) => ({ ...prev, pageIndex }))
            }
            pageSize={pagination.pageSize}
            onPageSizeChange={(pageSize) =>
              setPagination((prev) => ({ ...prev, pageSize, pageIndex: 0 }))
            }
            totalItems={filteredOrders.length}
            selectedRows={selectedRows}
            onSelectRow={(row, selected) => {
              if (selected) {
                setSelectedRows((prev) => [...prev, row.id]);
              } else {
                setSelectedRows((prev) => prev.filter((id) => id !== row.id));
              }
            }}
            onSelectAll={(selected) => {
              if (selected) {
                const pageIds = paginatedData.map((row) => row.id);
                setSelectedRows((prev) => [...new Set([...prev, ...pageIds])]);
              } else {
                const pageIds = paginatedData.map((row) => row.id);
                setSelectedRows((prev) =>
                  prev.filter((id) => !pageIds.includes(id))
                );
              }
            }}
            isAllSelected={
              selectedRows.length > 0 &&
              paginatedData.every((row) => selectedRows.includes(row.id))
            }
            isSomeSelected={
              selectedRows.length > 0 &&
              paginatedData.some((row) => selectedRows.includes(row.id))
            }
            enableRowSelection={true}
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
