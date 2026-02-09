import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// UI Components
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import SelectFilter from '@components/common/SelectFilter';
import DataTable from '@components/common/DataTable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@components/ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@components/ui/DropdownMenu';

// Icons
import {
  Search,
  Plus,
  Download,
  User,
  UserPlus,
  UserCheck,
  UserX,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  Edit,
  Clock,
  Trash2,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter as FilterIcon,
  SlidersHorizontal,
  Calendar as CalendarIcon,
} from 'lucide-react';

// Components
import { EditUserModal } from '@components/admin/EditUserModal';
import { ConfirmationDialog } from '@components/common/ConfirmationDialog';
import { PageHeader } from '@pages/dashboard/shared/PageHeader';
import ContentSkeleton from '@pages/dashboard/shared/ContentSkeleton';

// Utils
import { cn, formatDate } from '@/lib/utils';

// Status configuration for users
const statusConfig = {
  active: {
    label: 'Active',
    icon: UserCheck,
    variant: 'outline',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  inactive: {
    label: 'Inactive',
    icon: UserX,
    variant: 'outline',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  suspended: {
    label: 'Suspended',
    icon: ShieldAlert,
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    variant: 'warning',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

// Role configuration
const roleConfig = {
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    className:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  seller: {
    label: 'Seller',
    icon: UserCheck,
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  buyer: {
    label: 'Buyer',
    icon: User,
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  guest: {
    label: 'Guest',
    icon: UserX,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
};

const Users = () => {
  const navigate = useNavigate();

  // State for data and loading
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // State for filters
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    dateRange: 'all',
  });

  // State for pagination
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // State for sorting
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }]);

  // State for dialogs
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  // Mock data - in a real app, this would come from an API
  const mockUsers = useMemo(
    () => [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        status: 'active',
        lastLogin: '2023-06-15T14:30:00Z',
        joinDate: '2023-01-10T10:00:00Z',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'seller',
        status: 'active',
        lastLogin: '2023-06-16T09:15:00Z',
        joinDate: '2023-02-15T11:20:00Z',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      },
      {
        id: 3,
        name: 'Bob Johnson',
        email: 'bob@example.com',
        role: 'buyer',
        status: 'inactive',
        lastLogin: '2023-05-20T16:45:00Z',
        joinDate: '2023-03-05T14:10:00Z',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      },
      {
        id: 4,
        name: 'Alice Brown',
        email: 'alice@example.com',
        role: 'buyer',
        status: 'active',
        lastLogin: '2023-06-17T08:30:00Z',
        joinDate: '2023-04-12T13:25:00Z',
        avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
      },
      {
        id: 5,
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        role: 'seller',
        status: 'suspended',
        lastLogin: '2023-05-28T11:10:00Z',
        joinDate: '2023-03-20T09:40:00Z',
        avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
      },
      {
        id: 6,
        name: 'Emma Davis',
        email: 'emma@example.com',
        role: 'buyer',
        status: 'pending',
        lastLogin: '2023-06-18T10:20:00Z',
        joinDate: '2023-05-10T16:30:00Z',
        avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
      },
      {
        id: 7,
        name: 'Michael Johnson',
        email: 'michael@example.com',
        role: 'admin',
        status: 'active',
        lastLogin: '2023-06-17T14:15:00Z',
        joinDate: '2023-01-05T09:10:00Z',
        avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
      },
      {
        id: 8,
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        role: 'seller',
        status: 'active',
        lastLogin: '2023-06-16T11:45:00Z',
        joinDate: '2023-02-20T13:20:00Z',
        avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
      },
      {
        id: 9,
        name: 'David Lee',
        email: 'david@example.com',
        role: 'buyer',
        status: 'inactive',
        lastLogin: '2023-05-15T10:30:00Z',
        joinDate: '2023-03-10T14:50:00Z',
        avatar: 'https://randomuser.me/api/portraits/men/9.jpg',
      },
      {
        id: 10,
        name: 'Olivia Martinez',
        email: 'olivia@example.com',
        role: 'buyer',
        status: 'active',
        lastLogin: '2023-06-18T09:20:00Z',
        joinDate: '2023-04-05T11:15:00Z',
        avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
      },
    ],
    []
  );

  // Fetch users (simulated with mock data)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        setUsers(mockUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter((user) => user.status === filters.status);
    }

    // Apply role filter
    if (filters.role !== 'all') {
      result = result.filter((user) => user.role === filters.role);
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let fromDate;

      switch (filters.dateRange) {
        case 'today':
          fromDate = new Date(now);
          fromDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          fromDate = new Date(now);
          fromDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          fromDate = new Date(now);
          fromDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }

      if (fromDate) {
        result = result.filter((user) => new Date(user.joinDate) >= fromDate);
      }
    }

    // Apply sorting
    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      result.sort((a, b) => {
        if (a[id] < b[id]) return desc ? 1 : -1;
        if (a[id] > b[id]) return desc ? -1 : 1;
        return 0;
      });
    }

    return result;
  }, [users, searchQuery, filters, sorting]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      status: 'all',
      role: 'all',
      dateRange: 'all',
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    filters.status !== 'all' ||
    filters.role !== 'all' ||
    filters.dateRange !== 'all';

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle status filter change
  const handleStatusFilter = (value) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle role filter change
  const handleRoleFilter = (value) => {
    setFilters((prev) => ({ ...prev, role: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle date range filter change
  const handleDateRangeFilter = (value) => {
    setFilters((prev) => ({ ...prev, dateRange: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      setUsers((prev) => prev.filter((user) => user.id !== userToDelete.id));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleSuspendUser = (user) => {
    setUserToSuspend(user);
    setIsSuspendDialogOpen(true);
  };

  const confirmSuspendUser = async () => {
    if (!userToSuspend) return;

    try {
      setIsSuspending(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userToSuspend.id ? { ...user, status: 'suspended' } : user
        )
      );

      toast.success('User suspended successfully');
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setIsSuspendDialogOpen(false);
      setUserToSuspend(null);
      setIsSuspending(false);
    }
  };

  const handleActivateUser = async (user) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: 'active' } : u))
      );

      toast.success('User activated successfully');
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      className: 'text-left',
      cell: (row) => {
        const user = row.original || row;
        return (
          <div className='flex items-center'>
            <div className='h-10 w-10 rounded-full bg-muted overflow-hidden mr-3 flex-shrink-0'>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='h-full w-full bg-muted-foreground/10 flex items-center justify-center'>
                  <User className='h-5 w-5 text-muted-foreground' />
                </div>
              )}
            </div>
            <div className='flex flex-col'>
              <span className='font-medium text-foreground'>{user.name}</span>
              <span className='text-sm text-muted-foreground'>
                {user.email}
              </span>
            </div>
          </div>
        );
      },
      width: 300,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      className: 'text-left',
      cell: (row) => {
        const user = row.original || row;
        const role = roleConfig[user.role] || roleConfig.guest;
        const Icon = role.icon || User;

        return (
          <div className='flex items-center'>
            <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2'>
              <Icon className='h-3.5 w-3.5' />
            </div>
            <span className='font-medium text-foreground'>{role.label}</span>
          </div>
        );
      },
      width: 180,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'text-left',
      cell: (row) => {
        const user = row.original || row;
        const status = statusConfig[user.status] || statusConfig.inactive;
        const Icon = status.icon || User;

        return (
          <div className='flex items-center gap-2'>
            <Badge
              variant={status.variant}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap',
                status.className
              )}>
              <Icon className='h-3.5 w-3.5' />
              {status.label}
            </Badge>
          </div>
        );
      },
      width: 150,
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      className: 'text-right',
      cell: (row) => {
        const user = row.original || row;
        return (
          <div className='text-right'>
            <div className='text-sm text-foreground'>
              {user.lastLogin
                ? formatDate(user.lastLogin, 'MMM d, yyyy')
                : 'Never'}
            </div>
            <div className='text-xs text-muted-foreground'>
              {user.lastLogin ? formatDate(user.lastLogin, 'h:mm a') : ''}
            </div>
          </div>
        );
      },
      width: 150,
    },
    {
      key: 'joinDate',
      header: 'Join Date',
      sortable: true,
      className: 'text-right',
      cell: (row) => {
        const user = row.original || row;
        return (
          <div className='text-right'>
            <div className='text-sm text-foreground'>
              {formatDate(user.joinDate, 'MMM d, yyyy')}
            </div>
            <div className='text-xs text-muted-foreground'>
              {formatDate(user.joinDate, 'h:mm a')}
            </div>
          </div>
        );
      },
      width: 150,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      className: 'sticky right-0',
      cell: (row) => {
        const user = row.original || row;
        const isActive = user.status === 'active';

        return (
          <div className='flex justify-end'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
                  onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className='h-4 w-4' />
                  <span className='sr-only'>Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48'>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditUser(user);
                  }}>
                  <Edit className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/admin/users/${user.id}`);
                  }}>
                  <Eye className='mr-2 h-4 w-4' />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isActive ? (
                  <DropdownMenuItem
                    className='text-amber-600 dark:text-amber-400'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSuspendUser(user);
                    }}>
                    <ShieldOff className='mr-2 h-4 w-4' />
                    Suspend
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className='text-green-600 dark:text-green-400'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivateUser(user);
                    }}>
                    <UserCheck className='mr-2 h-4 w-4' />
                    Activate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user);
                  }}>
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      width: 60,
    },
  ];

  // Filter options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending', label: 'Pending' },
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'seller', label: 'Seller' },
    { value: 'buyer', label: 'Buyer' },
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  // Calculate pagination
  const pageCount = Math.ceil(filteredUsers.length / pagination.pageSize);
  const paginatedUsers = filteredUsers.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  // Handle row selection
  const handleRowSelect = (row) => {
    const userId = row.original.id;
    setSelectedRows((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedRows.length === 0) return;

    switch (action) {
      case 'delete':
        setUsers((prev) =>
          prev.filter((user) => !selectedRows.includes(user.id))
        );
        setSelectedRows([]);
        toast.success(`${selectedRows.length} users deleted successfully`);
        break;
      case 'activate':
        setUsers((prev) =>
          prev.map((user) =>
            selectedRows.includes(user.id)
              ? { ...user, status: 'active' }
              : user
          )
        );
        setSelectedRows([]);
        toast.success(`Activated ${selectedRows.length} users`);
        break;
      case 'deactivate':
        setUsers((prev) =>
          prev.map((user) =>
            selectedRows.includes(user.id)
              ? { ...user, status: 'inactive' }
              : user
          )
        );
        setSelectedRows([]);
        toast.success(`Deactivated ${selectedRows.length} users`);
        break;
      case 'suspend':
        setUsers((prev) =>
          prev.map((user) =>
            selectedRows.includes(user.id)
              ? { ...user, status: 'suspended' }
              : user
          )
        );
        setSelectedRows([]);
        toast.success(`Suspended ${selectedRows.length} users`);
        break;
      default:
        break;
    }
  };

  if (loading) {
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

  // Render the component
  return (
    <div className='space-y-6'>
      <PageHeader
        title='Users'
        description='Manage your users and their permissions'
        onAdd={() => navigate('/dashboard/admin/users/new')}
        addButtonLabel='Add User'
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        selectedCount={selectedRows.length}
        onClearSelection={() => setSelectedRows([])}
        onBulkAction={handleBulkAction}
        bulkActions={[
          { value: 'activate', label: 'Activate', icon: UserCheck },
          {
            value: 'deactivate',
            label: 'Deactivate',
            icon: UserX,
            destructive: true,
          },
          {
            value: 'suspend',
            label: 'Suspend',
            icon: ShieldOff,
            destructive: true,
          },
          { value: 'delete', label: 'Delete', icon: Trash2, destructive: true },
        ]}>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4'>
          <div className='relative w-full sm:w-80'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search users...'
              className='pl-9'
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <SelectFilter
              options={statusOptions}
              value={filters.status}
              onChange={handleStatusFilter}
              placeholder='Status'
              icon='SHIELD'
              className='w-[150px]'
            />
            <SelectFilter
              options={roleOptions}
              value={filters.role}
              onChange={handleRoleFilter}
              placeholder='Role'
              icon='USER'
              className='w-[130px]'
            />
            <SelectFilter
              options={dateRangeOptions}
              value={filters.dateRange}
              onChange={handleDateRangeFilter}
              placeholder='Date Range'
              icon='CALENDAR'
              className='w-[150px]'
            />
            <Button
              variant='outline'
              size='sm'
              className='h-9 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus-visible:ring-gray-400 sm:h-9 sm:flex-initial border border-gray-200 dark:border-gray-700'>
              <Download className='mr-2 h-4 w-4' />
              <span className='hidden sm:inline'>Export</span>
            </Button>
          </div>
        </div>
      </PageHeader>

      <Card>
        <CardContent className='p-0'>
          <DataTable
            columns={columns}
            data={paginatedUsers}
            loading={loading}
            sorting={sorting}
            onSortingChange={setSorting}
            pageCount={pageCount}
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            onPaginationChange={setPagination}
            totalItems={filteredUsers.length}
            className='border-0'
            rowClassName='hover:bg-muted/50 cursor-pointer'
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
                // Select all filtered users
                const allIds = filteredUsers.map((row) => row._id || row.id);
                setSelectedRows((prev) => [...new Set([...prev, ...allIds])]);
              } else {
                // Deselect all filtered users
                const allIds = filteredUsers.map((row) => row._id || row.id);
                setSelectedRows((prev) =>
                  prev.filter((id) => !allIds.includes(id)),
                );
              }
            }}
            emptyState={
              <div className='flex flex-col items-center justify-center py-12'>
                <UserX className='h-12 w-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-medium mb-1'>No users found</h3>
                <p className='text-sm text-muted-foreground mb-4'>
                  {searchQuery || hasActiveFilters
                    ? 'No users match your current filters'
                    : 'Get started by inviting your first user'}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={userToEdit}
        onSave={(updatedUser) => {
          setUsers((prev) =>
            prev.map((user) =>
              user.id === updatedUser.id ? updatedUser : user
            )
          );
          setIsEditModalOpen(false);
          toast.success('User updated successfully');
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDeleteUser}
        title='Delete User'
        description={`Are you sure you want to delete ${userToDelete?.name || 'this user'}? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant='destructive'
        disabled={isDeleting}
      />

      {/* Suspend Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isSuspendDialogOpen}
        onClose={() => setIsSuspendDialogOpen(false)}
        onConfirm={confirmSuspendUser}
        title='Suspend User'
        description={`Are you sure you want to suspend ${userToSuspend?.name || 'this user'}? They will not be able to access their account.`}
        confirmText={isSuspending ? 'Suspending...' : 'Suspend'}
        variant='warning'
        disabled={isSuspending}
      />
    </div>
  );
};

export default Users;
