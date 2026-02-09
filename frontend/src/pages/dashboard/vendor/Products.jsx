import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// UI Components
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import SelectFilter from '@components/common/SelectFilter';
import { ConfirmationDialog } from '@components/common/ConfirmationDialog';
import ContentSkeleton from '@pages/dashboard/shared/ContentSkeleton';
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
  Star,
  X,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Eye,
  Package,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter as FilterIcon,
  SlidersHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Archive,
  Tag,
  Box,
  DollarSign,
} from 'lucide-react';

// Utils
import { cn, formatCurrency } from '@/lib/utils';

// Import products data
import productsData from '@pages/dashboard/data/products.json';
import { useProduct } from '@/contexts/ProductContext';

// Product Data and Utilities
import {
  STATUS_CONFIG,
  filterProducts,
  sortProducts,
  getProductStatus,
  getUniqueCategories,
  getProductStatusConfig,
} from '@/constants/products';
import { PageHeader } from '@pages/dashboard/shared/PageHeader';
import { ROUTES } from '@/constants/routes';

// Status configuration for products
const statusConfig = {
  published: {
    label: 'Published',
    icon: CheckCircle,
    variant: 'outline',
  },
  draft: {
    label: 'Draft',
    icon: FileText,
    variant: 'outline',
  },
  out_of_stock: {
    label: 'Out of Stock',
    icon: XCircle,
    variant: 'destructive',
  },
  low_stock: {
    label: 'Low Stock',
    icon: AlertTriangle,
    variant: 'warning',
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    variant: 'secondary',
  },
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const {
    products,
    loading,
    error,
    fetchProducts,
    deleteProduct,
    resetProduct,
  } = useProduct();

  // console.log('PRODUCTS', products);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc',
  });
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    featured: false,
    stockStatus: 'all',
    priceRange: 'all',
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        await fetchProducts();
      } catch (error) {
        toast.error(error.message || 'Failed to load products');
      }
    };
    loadProducts();
  }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        toast.success('Product deleted successfully');
        setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
      } catch (error) {
        toast.error(error.message || 'Failed to delete product');
      }
    }
  };
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRows.length} selected products?`,
      )
    ) {
      try {
        await Promise.all(selectedRows.map((id) => deleteProduct(id)));
        toast.success(`${selectedRows.length} products deleted successfully`);
        setSelectedRows([]);
      } catch (error) {
        toast.error('Failed to delete some products');
      }
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((product) => {
      if (product.category) cats.add(product.category);
    });
    return Array.from(cats);
  }, [products]);

  // Status options for filter
  const statusOptions = useMemo(
    () => ({
      all: 'All Statuses',
      published: 'Published',
      draft: 'Draft',
      out_of_stock: 'Out of Stock',
      low_stock: 'Low Stock',
      archived: 'Archived',
    }),
    [],
  );

  // Category options for filter
  const categoryOptions = useMemo(
    () => ({
      all: 'All Categories',
      ...categories.reduce(
        (acc, category) => ({
          ...acc,
          [category]: category,
        }),
        {},
      ),
    }),
    [categories],
  );

  // Stock status options
  const stockStatusOptions = useMemo(
    () => ({
      all: 'All Stock',
      in_stock: 'In Stock',
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock',
    }),
    [],
  );

  // Price range options
  const priceRangeOptions = useMemo(
    () => ({
      all: 'All Prices',
      under_25: 'Under $25',
      '25_to_50': '$25 - $50',
      over_50: 'Over $50',
    }),
    [],
  );

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter((product) => product.status === filters.status);
    }

    // Apply category filter
    if (filters.category !== 'all') {
      result = result.filter(
        (product) => product.category === filters.category,
      );
    }

    // Apply stock status filter
    if (filters.stockStatus === 'in_stock') {
      result = result.filter((product) => product.stock > 0);
    } else if (filters.stockStatus === 'out_of_stock') {
      result = result.filter((product) => product.stock <= 0);
    } else if (filters.stockStatus === 'low_stock') {
      result = result.filter(
        (product) =>
          product.stock > 0 &&
          product.stock <= (product.lowStockThreshold || 10),
      );
    }

    // Apply price range filter
    if (filters.priceRange === 'under_25') {
      result = result.filter((product) => product.price < 25);
    } else if (filters.priceRange === '25_to_50') {
      result = result.filter(
        (product) => product.price >= 25 && product.price <= 50,
      );
    } else if (filters.priceRange === 'over_50') {
      result = result.filter((product) => product.price > 50);
    }

    // Apply featured filter
    if (filters.featured) {
      result = result.filter((product) => product.isFeatured);
    }

    return result;
  }, [products, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Filter handlers
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleStatusFilter = (status) => {
    setFilters((prev) => ({ ...prev, status }));
    setCurrentPage(1);
  };

  const handleCategoryFilter = (category) => {
    setFilters((prev) => ({ ...prev, category }));
    setCurrentPage(1);
  };

  const handleStockStatusFilter = (stockStatus) => {
    setFilters((prev) => ({ ...prev, stockStatus }));
    setCurrentPage(1);
  };

  const handlePriceRangeFilter = (priceRange) => {
    setFilters((prev) => ({ ...prev, priceRange }));
    setCurrentPage(1);
  };

  const toggleFeaturedFilter = () => {
    setFilters((prev) => ({ ...prev, featured: !prev.featured }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      status: 'all',
      category: 'all',
      featured: false,
      stockStatus: 'all',
      priceRange: 'all',
    });
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.featured ||
    filters.stockStatus !== 'all' ||
    filters.priceRange !== 'all';

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

  // Define table columns
  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      className: 'text-left',
      cell: (row) => {
        const product = row.original || row;
        return (
          <div className='flex flex-col'>
            <Link
              to={`/dashboard/vendor/products/${product._id}`}
              className='font-medium text-foreground hover:underline inline-flex items-center'
              onClick={(e) => e.stopPropagation()}>
              {product.name}
              <FileText className='h-3.5 w-3.5 ml-1.5 text-muted-foreground' />
            </Link>
            <div className='flex items-center mt-1'>
              <div className='h-8 w-8 rounded-md bg-muted overflow-hidden mr-2 flex-shrink-0'>
                {product.thumbnail ? (
                  <img
                    src={product.thumbnail}
                    alt={product.name}
                    className='h-full w-full object-cover'
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/40';
                    }}
                  />
                ) : (
                  <div className='h-full w-full bg-muted-foreground/10 flex items-center justify-center'>
                    <span className='text-xs text-muted-foreground'>
                      No image
                    </span>
                  </div>
                )}
              </div>
              <span className='text-xs text-muted-foreground'>
                SKU: {product.sku || 'N/A'}
              </span>
            </div>
          </div>
        );
      },
      width: 350,
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      className: 'text-left',
      cell: (row) => {
        const product = row.original || row;
        return (
          <div className='flex items-center'>
            <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2'>
              <Tag className='h-3.5 w-3.5' />
            </div>
            <span className='font-medium text-foreground'>
              {product.category || 'Uncategorized'}
            </span>
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
        const product = row.original || row;
        const status = product.status || 'draft';
        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;

        return (
          <div className='flex items-center gap-2'>
            <Badge
              variant={config.variant}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap',
                status === 'published' &&
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                status === 'draft' &&
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                status === 'out_of_stock' &&
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                status === 'low_stock' &&
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                status === 'archived' &&
                  'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
              )}>
              <Icon className='h-3.5 w-3.5' />
              {config.label}
            </Badge>
            {product.isFeatured && (
              <Badge
                variant='outline'
                className='whitespace-nowrap border-purple-500 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'>
                <Star className='h-3 w-3 mr-1 fill-purple-500 text-purple-500' />
                Featured
              </Badge>
            )}
          </div>
        );
      },
      width: 180,
    },
    {
      key: 'stock',
      header: 'Inventory',
      sortable: true,
      className: 'text-center',
      cell: (row) => {
        const product = row.original || row;
        const stockQty =
          typeof product.stock === 'object'
            ? product.stock.qty || 0
            : product.stock || 0;
        const stockStatus =
          typeof product.stock === 'object'
            ? product.stock.status || 'in_stock'
            : 'in_stock';
        const lowStockThreshold = product.lowStockThreshold || 10;

        // Map stock status to display text
        const statusMap = {
          in_stock: 'In Stock',
          out_of_stock: 'Out of Stock',
          preorder: 'Pre-Order',
          backorder: 'Backordered',
        };

        // Determine status color
        let statusColor = 'bg-green-500';
        if (stockQty <= 0) {
          statusColor = 'bg-red-500';
        } else if (stockQty <= lowStockThreshold) {
          statusColor = 'bg-amber-500';
        }

        return (
          <div className='flex flex-col items-center'>
            <div className='flex items-center'>
              <span
                className={`h-2.5 w-2.5 rounded-full mr-2 ${statusColor}`}
              />
              <span className='font-medium'>{stockQty}</span>
              <span className='text-muted-foreground ml-1'>
                {statusMap[stockStatus] || 'In Stock'}
              </span>
            </div>
            {stockQty > 0 && stockQty <= lowStockThreshold && (
              <div className='text-xs text-amber-600 dark:text-amber-400 mt-0.5'>
                Low stock
              </div>
            )}
            {stockQty <= 0 && (
              <div className='text-xs text-red-600 dark:text-red-400 mt-0.5'>
                Out of stock
              </div>
            )}
          </div>
        );
      },
      width: 200,
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      className: 'text-right',
      cell: (row) => {
        const product = row.original || row;
        return (
          <div className='flex flex-col items-end'>
            {product.salePrice ? (
              <>
                <span className='text-foreground font-medium'>
                  {formatCurrency(product.salePrice)}
                </span>
                <span className='text-muted-foreground line-through text-xs'>
                  {formatCurrency(product.price)}
                </span>
              </>
            ) : (
              <span className='text-foreground font-medium'>
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
        );
      },
      width: 120,
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      className: 'text-right',
      cell: (row) => {
        const product = row.original || row;
        const updatedAt = product.updatedAt || new Date();
        return (
          <div className='text-right'>
            <div className='text-sm text-foreground'>
              {new Date(updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className='text-xs text-muted-foreground'>
              {new Date(updatedAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        );
      },
      width: 160,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      className: 'sticky right-0',
      cell: (row) => {
        const product = row.original || row;
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
                    navigate(`/dashboard/seller/products/${product._id}`);
                  }}>
                  <Edit className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(
                      `/dashboard/seller/products/${product._id}?view=true`,
                    );
                  }}>
                  <Eye className='mr-2 h-4 w-4' />
                  View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        'Are you sure you want to delete this product?',
                      )
                    ) {
                      setProducts((prev) =>
                        prev.filter((p) => p._id !== product._id),
                      );
                      toast.success('Product deleted');
                    }
                  }}>
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      width: 80,
    },
  ];

  // Bulk actions
  const handleBulkAction = (action) => {
    if (selectedRows.length === 0) return;

    switch (action) {
      case 'delete':
        if (
          window.confirm(
            `Are you sure you want to delete ${selectedRows.length} selected products?`,
          )
        ) {
          setProducts((prev) =>
            prev.filter((p) => !selectedRows.includes(p._id)),
          );
          setSelectedRows([]);
          toast.success(`${selectedRows.length} products deleted`);
        }
        break;
      case 'publish':
        setProducts((prev) =>
          prev.map((p) =>
            selectedRows.includes(p._id) ? { ...p, status: 'published' } : p,
          ),
        );
        setSelectedRows([]);
        toast.success(`${selectedRows.length} products published`);
        break;
      case 'draft':
        setProducts((prev) =>
          prev.map((p) =>
            selectedRows.includes(p._id) ? { ...p, status: 'draft' } : p,
          ),
        );
        setSelectedRows([]);
        toast.success(`${selectedRows.length} products moved to draft`);
        break;
      default:
        break;
    }
  };

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Products'
        description='Manage your products and inventory'
        onAdd={() => navigate(ROUTES.DASHBOARD.SELLER_PRODUCT_NEW)}
        addButtonLabel='Add Product'
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        selectedCount={selectedRows.length}
        onClearSelection={() => setSelectedRows([])}
        onBulkAction={handleBulkAction}
        bulkActions={[
          { value: 'publish', label: 'Publish', icon: CheckCircle },
          { value: 'draft', label: 'Move to Draft', icon: FileText },
          { value: 'delete', label: 'Delete', icon: Trash2, destructive: true },
        ]}>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search products...'
              className='w-full pl-10 h-9'
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
              icon='SLIDERS'
              className='h-9 text-sm'
            />
            <SelectFilter
              options={categoryOptions}
              value={filters.category}
              onChange={handleCategoryFilter}
              placeholder='Category'
              icon='TAG'
              className='h-9 text-sm'
            />
            <SelectFilter
              options={stockStatusOptions}
              value={filters.stockStatus}
              onChange={handleStockStatusFilter}
              placeholder='Stock Status'
              icon='PACKAGE'
              className='h-9 text-sm'
            />
            <SelectFilter
              options={priceRangeOptions}
              value={filters.priceRange}
              onChange={handlePriceRangeFilter}
              placeholder='Price Range'
              icon='DOLLAR_SIGN'
              className='h-9 text-sm'
            />
            <Button
              variant={filters.featured ? 'default' : 'outline'}
              size='sm'
              className='h-9 gap-1.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus-visible:ring-gray-400 sm:h-9 sm:flex-initial border border-gray-200 dark:border-gray-700'
              onClick={toggleFeaturedFilter}>
              <Star className='h-3.5 w-3.5' />
              <span className='sr-only sm:not-sr-only'>Featured</span>
            </Button>
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

      {/* Data Table */}
      <Card>
        <CardContent className='p-0'>
          <DataTable
            columns={columns}
            data={filteredProducts}
            totalItems={filteredProducts.length}
            pagination={{
              currentPage,
              pageSize,
              totalItems: filteredProducts.length,
              onPageChange: setCurrentPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: [10, 20, 50, 100],
            }}
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
                // Select all filtered products
                const allIds = filteredProducts.map((row) => row._id || row.id);
                setSelectedRows((prev) => [...new Set([...prev, ...allIds])]);
              } else {
                // Deselect all filtered products
                const allIds = filteredProducts.map((row) => row._id || row.id);
                setSelectedRows((prev) =>
                  prev.filter((id) => !allIds.includes(id)),
                );
              }
            }}
            emptyState={
              <div className='flex flex-col items-center justify-center py-12'>
                <Package className='h-12 w-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-medium text-foreground mb-1'>
                  No products found
                </h3>
                <p className='text-muted-foreground text-sm mb-4'>
                  {hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'Get started by adding a new product'}
                </p>
                {!hasActiveFilters && (
                  <Button
                    onClick={() =>
                      navigate(ROUTES.DASHBOARD.SELLER_PRODUCT_NEW)
                    }>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Product
                  </Button>
                )}
                {hasActiveFilters && (
                  <Button variant='outline' onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
