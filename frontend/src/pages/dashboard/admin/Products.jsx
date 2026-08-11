import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Search, Trash2, Package } from 'lucide-react';

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
import { vendorName } from '../shared/tokens.js';
import { categoryOptions } from '../../../data/categories.js';
import { useCategories } from '../../../hooks/useCategories.js';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import apiClient from '../../../api/apiClient.js';

const AdminProducts = () => {
  const { categories } = useCategories();
  const confirm = useConfirm();
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [filters, setFilters] = useState({ category: 'all', vendor: 'all' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState({ key: 'updatedAt', direction: 'descending' });

  const sortParam = useMemo(
    () => `${sort.direction === 'descending' ? '-' : ''}${sort.key}`,
    [sort]
  );

  // Vendor filter options come from the user list; only vendors can own a
  // product, so customers/admins are excluded.
  useEffect(() => {
    apiClient
      .get('/admin/users')
      .then((res) => setVendors((res.data.users || []).filter((u) => u.role === 'vendor')))
      .catch(() => setVendors([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get('/admin/products', {
        params: {
          page,
          limit: pageSize,
          sort: sortParam,
          ...(search ? { search } : {}),
          ...(filters.category !== 'all' ? { category: filters.category } : {}),
          ...(filters.vendor !== 'all' ? { vendor: filters.vendor } : {}),
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
  useEffect(() => setPage(1), [search, filters, pageSize]);

  const handleDelete = async (product) => {
    const confirmed = await confirm({
      title: 'Delete this listing?',
      message: `"${product.name}" is removed from the catalogue for good. Orders that already include it are unaffected.`,
      confirmLabel: 'Delete listing',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/admin/product/${product._id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const vendorOptions = useMemo(
    () => ({
      all: 'All Vendors',
      ...vendors.reduce((acc, v) => ({ ...acc, [v._id]: vendorName(v) }), {}),
    }),
    [vendors]
  );

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ category: 'all', vendor: 'all' });
  };
  const hasActiveFilters = Boolean(searchInput) || filters.category !== 'all' || filters.vendor !== 'all';

  // An admin doesn't edit someone else's listing — the only action here is
  // removal, which was a menu wrapping a single item.
  const rowActions = (product) => (
    <RowActions>
      <IconAction
        icon={Trash2}
        label={`Delete ${product.name}`}
        tone='danger'
        onClick={() => handleDelete(product)}
      />
    </RowActions>
  );

  // Vendor earns a column here (it's the whole point of a marketplace view)
  // that the vendor's own table has no use for. Seven columns is more than a
  // narrow desktop fits, so the two an admin scans least — vendor, which the
  // filter above already covers, and the Updated stamp — step out first.
  const columns = [
    { key: 'name', header: 'Product', className: 'text-left', cell: (p) => <ProductIdentity product={p} /> },
    {
      key: 'vendor',
      header: 'Vendor',
      className: 'text-left',
      hideBelow: 'lg',
      cell: (p) => <span className='line-clamp-1 text-sm text-foreground'>{vendorName(p.vendor)}</span>,
    },
    { key: 'price', header: 'Price', className: 'text-right', cell: (p) => <PriceCell product={p} /> },
    { key: 'stock.qty', header: 'Inventory', className: 'text-left', cell: (p) => <StockCell product={p} /> },
    { key: 'isActive', header: 'Status', className: 'text-left', cell: (p) => <StatusBadge product={p} /> },
    {
      key: 'updatedAt',
      header: 'Updated',
      className: 'text-right',
      hideBelow: 'xl',
      cell: (p) => <UpdatedCell value={p.updatedAt} />,
    },
    { key: 'actions', header: 'Actions', sortable: false, className: 'sticky text-right', cell: rowActions },
  ];

  const mobileCard = (product) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-2'>
        <ProductIdentity product={product} />
        {rowActions(product)}
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground'>
        <span>Sold by {vendorName(product.vendor)}</span>
        <UpdatedCell value={product.updatedAt} prefix='Updated' />
      </div>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
        <PriceCell product={product} align='start' />
        <div className='flex items-center gap-3'>
          <StockCell product={product} />
          <StatusBadge product={product} />
        </div>
      </div>
    </div>
  );

  if (loading && !initialised) {
    return <ContentSkeleton showTable rows={8} columns={7} hasActions showHeaderSection />;
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Products'
        description={`${meta.total.toLocaleString()} listings across every vendor`}
        showClearFilters={hasActiveFilters}
        onClearFilters={clearFilters}>
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
            options={vendorOptions}
            value={filters.vendor}
            onChange={(vendor) => setFilters((f) => ({ ...f, vendor }))}
            placeholder='Vendor'
            icon='USERS'
            className='h-9 w-full text-sm sm:w-52'
          />
          <SelectFilter
            options={categoryOptions(categories)}
            value={filters.category}
            onChange={(category) => setFilters((f) => ({ ...f, category }))}
            placeholder='Category'
            icon='TAG'
            className='h-9 w-full text-sm sm:w-44'
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
                <h3 className='font-medium text-foreground'>No products found</h3>
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

export default AdminProducts;
