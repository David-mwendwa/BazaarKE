import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent } from '../../../components/ui/Card';
import SelectFilter from '../../../components/common/SelectFilter';
import DataTable from '../../../components/common/DataTable';
import ContentSkeleton from '../shared/ContentSkeleton';
import { useConfirm } from '../../../context/ConfirmContext.js';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import { IconAction, RowActions } from '../shared/RowActions.jsx';

import { ProductIdentity, PriceCell, StockCell, StatusBadge, UpdatedCell } from '../shared/productCells.jsx';
import { STOCK_STATUS_OPTIONS } from '../shared/filterOptions.js';
import { categoryOptions } from '../../../data/categories.js';
import { useCategories } from '../../../hooks/useCategories.js';
import { ROUTES } from '../../../constants/routes';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import apiClient from '../../../api/apiClient.js';

const ProductsPage = () => {
  const { categories } = useCategories();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [filters, setFilters] = useState({ category: 'all', stockStatus: 'all' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState({ key: 'updatedAt', direction: 'descending' });

  const sortParam = useMemo(
    () => `${sort.direction === 'descending' ? '-' : ''}${sort.key}`,
    [sort]
  );

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get('/vendor/products', {
        params: {
          page,
          limit: pageSize,
          sort: sortParam,
          ...(search ? { search } : {}),
          ...(filters.category !== 'all' ? { category: filters.category } : {}),
          ...(filters.stockStatus !== 'all' ? { stockStatus: filters.stockStatus } : {}),
        },
      })
      .then((res) => {
        setProducts(res.data.products || []);
        setMeta({ total: res.data.total || 0, totalPages: res.data.totalPages || 1 });
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load products'))
      .finally(() => {
        setLoading(false);
        setInitialised(true);
      });
  }, [page, pageSize, sortParam, search, filters]);

  useEffect(load, [load]);

  // Any change to what's being filtered invalidates the current page number.
  useEffect(() => setPage(1), [search, filters, pageSize]);

  const handleDelete = async (product) => {
    const confirmed = await confirm({
      title: 'Delete this listing?',
      message: `"${product.name}" comes off the shop for good. Orders that already include it are unaffected.`,
      confirmLabel: 'Delete listing',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/vendor/products/${product._id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ category: 'all', stockStatus: 'all' });
  };
  const hasActiveFilters =
    Boolean(searchInput) || filters.category !== 'all' || filters.stockStatus !== 'all';

  const editPath = (product) => `/dashboard/vendor/products/${product._id}/edit`;

  const rowActions = (product) => (
    <RowActions>
      {/* A real link, so middle-click and ⌘-click open the editor in a new tab
          — which is how you edit several listings in one sitting. */}
      <IconAction icon={Edit} label={`Edit ${product.name}`} tone='primary' to={editPath(product)} />
      <IconAction
        icon={Trash2}
        label={`Delete ${product.name}`}
        tone='danger'
        onClick={() => handleDelete(product)}
      />
    </RowActions>
  );

  // Each column carries something the vendor acts on. Category and SKU live
  // inside the product cell rather than owning columns of their own; Updated
  // earns one because it's the default sort and has to be reversible.
  const columns = [
    {
      key: 'name',
      header: 'Product',
      className: 'text-left',
      cell: (product) => <ProductIdentity product={product} to={editPath(product)} LinkComponent={Link} />,
    },
    { key: 'price', header: 'Price', className: 'text-right', cell: (product) => <PriceCell product={product} /> },
    { key: 'stock.qty', header: 'Inventory', className: 'text-left', cell: (product) => <StockCell product={product} /> },
    { key: 'isActive', header: 'Status', className: 'text-left', cell: (product) => <StatusBadge product={product} /> },
    {
      key: 'updatedAt',
      header: 'Updated',
      className: 'text-right',
      hideBelow: 'lg',
      cell: (product) => <UpdatedCell value={product.updatedAt} />,
    },
    { key: 'actions', header: 'Actions', sortable: false, className: 'sticky text-right', cell: rowActions },
  ];

  const mobileCard = (product) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-2'>
        <Link to={editPath(product)} className='min-w-0'>
          <ProductIdentity product={product} />
        </Link>
        {rowActions(product)}
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
        <PriceCell product={product} align='start' />
        <div className='flex items-center gap-3'>
          <StockCell product={product} />
          <StatusBadge product={product} />
        </div>
      </div>
      <UpdatedCell value={product.updatedAt} prefix='Updated' />
    </div>
  );

  if (loading && !initialised) {
    return <ContentSkeleton showTable rows={8} columns={6} hasActions showHeaderSection />;
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Products'
        description='Manage your listings, pricing and stock'
        onAdd={() => navigate(ROUTES.DASHBOARD.VENDOR_PRODUCT_NEW)}
        addButtonLabel='Add Product'
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}
>
        <PageHeaderFilters>
          <div className='relative w-full sm:max-w-xs'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search name or SKU…'
              className='h-9 w-full pl-10'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <SelectFilter
            options={categoryOptions(categories)}
            value={filters.category}
            onChange={(category) => setFilters((f) => ({ ...f, category }))}
            placeholder='Category'
            icon='TAG'
            className='h-9 w-full text-sm sm:w-44'
          />
          <SelectFilter
            options={STOCK_STATUS_OPTIONS}
            value={filters.stockStatus}
            onChange={(stockStatus) => setFilters((f) => ({ ...f, stockStatus }))}
            placeholder='Stock'
            icon='PACKAGE'
            className='h-9 w-full text-sm sm:w-40'
          />
        </PageHeaderFilters>
      </PageHeader>

      <Card>
        <CardContent className={`p-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <DataTable
            columns={columns}
            data={products}
            mobileCard={mobileCard}
            pagination={{
              page,
              pageSize,
              totalItems: meta.total,
              totalPages: meta.totalPages,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            rowsPerPageOptions={[20, 50, 100]}
            sort={sort}
            onSortChange={setSort}
            emptyState={
              <div className='flex flex-col items-center justify-center gap-3 py-12'>
                <Package className='h-10 w-10 text-muted-foreground' />
                <div>
                  <h3 className='font-medium text-foreground'>No products found</h3>
                  <p className='text-sm text-muted-foreground'>
                    {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first product to start selling'}
                  </p>
                </div>
                {hasActiveFilters ? (
                  <Button variant='outline' onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => navigate(ROUTES.DASHBOARD.VENDOR_PRODUCT_NEW)}>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Product
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
