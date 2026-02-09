import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Package } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

// UI Components
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import SelectFilter from '@components/common/SelectFilter';
import DataTable from '@components/common/DataTable';
import ContentSkeleton from '@pages/dashboard/shared/ContentSkeleton';
import { ConfirmationDialog } from '@components/common/ConfirmationDialog';
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
import { PageHeader } from '@pages/dashboard/shared/PageHeader';

// Icons
import {
  Search,
  Plus,
  Download,
  Box,
  Boxes,
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
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Tag,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

// Utils
import { cn, formatDate } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import categoriesData from '@/data/categories.json';
const mockCategories = categoriesData;

// Status configuration for categories
const statusConfig = {
  active: {
    label: 'Active',
    icon: Check,
    variant: 'outline',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  inactive: {
    label: 'Inactive',
    icon: X,
    variant: 'outline',
    className:
      'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
  featured: {
    label: 'Featured',
    icon: Tag,
    variant: 'outline',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
};

const Categories = () => {
  const navigate = useNavigate();

  // State for data and loading
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // State for filters
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
  });

  // State for pagination
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // State for sorting
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }]);

  // State for dialogs and bulk actions
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);

  // Use categories from the imported JSON file
  const mockCategories = useMemo(() => {
    return categoriesData.map((category) => ({
      ...category,
      // Ensure we have an id field for compatibility with existing code
      id: category._id,
      // Add any missing fields with default values
      status: category.status || 'active',
      isFeatured: category.isFeatured || false,
      productCount: category.productCount || 0,
      createdAt: category.createdAt || new Date().toISOString(),
      updatedAt: category.updatedAt || new Date().toISOString(),
    }));
  }, [categoriesData]);

  // Simulate data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        setCategories(mockCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mockCategories]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      status: 'all',
      dateRange: 'all',
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery || filters.status !== 'all' || filters.dateRange !== 'all';

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle status filter change
  const handleStatusFilterChange = (value) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle date range filter change
  const handleDateRangeFilterChange = (value) => {
    setFilters((prev) => ({ ...prev, dateRange: value }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  // Handle row selection
  const handleRowSelection = (row) => {
    const id = row.original?.id || row.id;
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle select all rows
  const handleSelectAllRows = (rows) => {
    if (selectedRows.length === rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(rows.map((row) => row.original?.id || row.id));
    }
  };

  // Handle delete category
  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete category
  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      if (categoryToDelete.id === 'bulk') {
        // Handle bulk delete
        setCategories((prev) =>
          prev.filter((cat) => !selectedRows.includes(cat.id))
        );
        setSelectedRows([]);
      } else {
        // Handle single delete
        setCategories((prev) =>
          prev.filter((cat) => cat.id !== categoryToDelete.id)
        );
      }

      toast.success(
        categoryToDelete.id === 'bulk'
          ? `${selectedRows.length} categories deleted successfully`
          : 'Category deleted successfully'
      );

      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedRows.length === 0) return;

    switch (action) {
      case 'delete':
        setCategoryToDelete({ id: 'bulk' });
        setIsDeleteDialogOpen(true);
        break;
      case 'activate':
        // Update categories status to active
        setCategories((prev) =>
          prev.map((cat) =>
            selectedRows.includes(cat.id) ? { ...cat, status: 'active' } : cat
          )
        );
        toast.success(`${selectedRows.length} categories activated`);
        setSelectedRows([]);
        break;
      case 'deactivate':
        // Update categories status to inactive
        setCategories((prev) =>
          prev.map((cat) =>
            selectedRows.includes(cat.id) ? { ...cat, status: 'inactive' } : cat
          )
        );
        toast.success(`${selectedRows.length} categories deactivated`);
        setSelectedRows([]);
        break;
      default:
        break;
    }
  };

  // Handle add new category
  const handleAddNew = () => {
    // This function is now a no-op since we've removed the edit modal
    // You can implement a different action here if needed
  };

  // Filter categories based on search and filters
  const filteredCategories = useMemo(() => {
    return mockCategories.filter((category) => {
      // Filter by search query
      const matchesSearch =
        !searchQuery ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description &&
          category.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      // Filter by status
      const matchesStatus =
        filters.status === 'all' || category.status === filters.status;

      // Filter by date range (simplified example)
      const matchesDateRange = true; // Implement date range filtering as needed

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [mockCategories, searchQuery, filters.status, filters.dateRange]);

  // Calculate pagination
  const pageCount = Math.ceil(filteredCategories.length / pagination.pageSize);
  const paginatedCategories = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredCategories.slice(start, end);
  }, [filteredCategories, pagination]);

  // Table columns
  const columns = useMemo(
    () => [
      {
        accessor: 'name',
        header: 'Name',
        cell: (row) => {
          const category = row.original || row;
          return (
            <div className='flex items-center'>
              <div className='h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center'>
                <Boxes className='h-5 w-5 text-gray-500' />
              </div>
              <div className='ml-4'>
                <div className='font-medium text-gray-900 dark:text-white'>
                  {category.name}
                </div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>
                  {category.productCount} products
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessor: 'description',
        header: 'Description',
        cell: (row) => {
          const category = row.original || row;
          return (
            <div className='text-sm text-gray-500 dark:text-gray-400 line-clamp-2'>
              {category.description || 'No description'}
            </div>
          );
        },
      },
      {
        accessor: 'status',
        header: 'Status',
        cell: (row) => {
          const category = row.original || row;
          const status = statusConfig[category.status] || statusConfig.inactive;
          const Icon = status.icon;

          return (
            <div
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                status.className
              )}>
              <Icon className='mr-1 h-3 w-3' />
              {status.label}
            </div>
          );
        },
      },
      {
        accessor: 'isFeatured',
        header: 'Featured',
        cell: (row) => {
          const category = row.original || row;
          return category.isFeatured ? (
            <div className='inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400'>
              <Tag className='mr-1 h-3 w-3' />
              Featured
            </div>
          ) : (
            <span className='text-sm text-gray-500 dark:text-gray-400'>-</span>
          );
        },
      },
      {
        accessor: 'updatedAt',
        header: 'Last Updated',
        cell: (row) => {
          const category = row.original || row;
          return (
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              {formatDate(
                category.updatedAt || category.createdAt,
                'MMM d, yyyy'
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        sortable: false,
        cell: (row) => {
          const category = row.original || row;
          return (
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
              <DropdownMenuContent align='end'>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    navigate(
                      `/dashboard/admin/categories/${category._id || category.id}/edit`
                    );
                  }}
                  className='cursor-pointer'>
                  <Edit className='mr-2 h-4 w-4' />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigate(
                      `/dashboard/admin/categories/${category._id || category.id}/edit?view=true`
                    );
                  }}
                  className='cursor-pointer'>
                  <Eye className='mr-4 h-4 w-4' />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteCategory(category)}
                  className='cursor-pointer text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'>
                  <Trash2 className='mr-2 h-4 w-4' />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 50,
      },
    ],
    [selectedRows, navigate]
  );

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

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Categories'
        description='Manage your product categories'
        onAdd={() => navigate('/dashboard/admin/categories/new')}
        addButtonLabel='Add Category'
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        selectedCount={selectedRows.length}
        onClearSelection={() => setSelectedRows([])}
        onBulkAction={(action) => handleBulkAction(action)}
        bulkActions={[
          {
            value: 'delete',
            label: 'Delete',
            icon: Trash2,
            destructive: true,
          },
        ]}>
        {/* Search and Filters */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search categories...'
              className='w-full pl-10 h-9'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <SelectFilter
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              value={filters.status}
              onChange={handleStatusFilterChange}
              placeholder='Status'
              icon='SLIDERS'
              className='h-9 text-sm'
            />
            <SelectFilter
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
              ]}
              value={filters.dateRange}
              onChange={handleDateRangeFilterChange}
              placeholder='Date Range'
              icon='CALENDAR'
              className='h-9 text-sm'
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

      {/* DataTable */}
      <Card>
        <CardContent className='p-0 [&>*]:pt-6'>
          <DataTable
            columns={columns}
            data={paginatedCategories}
            pageCount={pageCount}
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              onPageChange: (page) => {
                setPagination((prev) => ({ ...prev, pageIndex: page }));
              },
              onPageSizeChange: (size) => {
                setPagination((prev) => ({ ...prev, pageSize: size }));
              },
            }}
            onSortingChange={setSorting}
            sorting={sorting}
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
                // Select all filtered categories
                const allIds = filteredCategories.map((row) => row._id || row.id);
                setSelectedRows((prev) => [...new Set([...prev, ...allIds])]);
              } else {
                // Deselect all filtered categories
                const allIds = filteredCategories.map((row) => row._id || row.id);
                setSelectedRows((prev) =>
                  prev.filter((id) => !allIds.includes(id)),
                );
              }
            }}
            emptyState={
              <div className='flex flex-col items-center justify-center py-12'>
                <Package className='h-12 w-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-medium mb-1'>
                  No categories found
                </h3>
                <p className='text-sm text-muted-foreground mb-4'>
                  {searchQuery || hasActiveFilters
                    ? 'No categories match your current filters'
                    : 'Get started by creating your first category'}
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDelete}
        title={`Delete ${categoryToDelete?.id === 'bulk' ? 'Selected Categories' : 'Category'}`}
        description={
          categoryToDelete?.id === 'bulk'
            ? `Are you sure you want to delete ${selectedRows.length} selected categories? This action cannot be undone.`
            : `Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant='destructive'
        disabled={isDeleting}
      />
    </div>
  );
};

export default Categories;
