import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown, FiSearch } from 'react-icons/fi';
import apiClient from '../api/apiClient.js';
import ProductCard from '../components/ui/ProductCard.jsx';
import ProductFilters from '../components/products/ProductFilters.jsx';
import { useCategories } from '../hooks/useCategories.js';

const PAGE_SIZE_OPTIONS = [12, 24, 48];
const DEFAULT_PAGE_SIZE = 24;

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);

const Select = ({ value, onChange, options, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={onChange}
      className='w-full appearance-none rounded-md border border-dark-300 pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <FiChevronDown
      className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400'
      size={16}
    />
  </div>
);

const SkeletonCard = () => (
  <div className='bg-white rounded-lg border border-dark-200 overflow-hidden animate-pulse'>
    <div className='aspect-square bg-dark-100' />
    <div className='p-4 space-y-2'>
      <div className='h-3 bg-dark-100 rounded-md w-1/2' />
      <div className='h-4 bg-dark-100 rounded-md w-3/4' />
      <div className='h-4 bg-dark-100 rounded-md w-1/3' />
    </div>
  </div>
);

const Products = () => {
  const { categories } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const onSale = searchParams.get('onSale') === 'true';
  const sort = searchParams.get('sort') || '-createdAt';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const brands = searchParams.getAll('brand');
  const minRating = searchParams.get('rating') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') || '', 10);
  const limit = PAGE_SIZE_OPTIONS.includes(rawLimit) ? rawLimit : DEFAULT_PAGE_SIZE;

  const [products, setProducts] = useState([]);
  const [productCount, setProductCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [facets, setFacets] = useState({ brands: [], priceRange: { min: 0, max: 0 } });
  // Mobile keeps its filters behind a button; the sidebar is desktop-only.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateParams = (updates, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      next.delete(key);
      if (Array.isArray(value)) {
        value.forEach((v) => next.append(key, v));
      } else if (value) {
        next.set(key, value);
      }
    });
    if (resetPage) next.delete('page');
    setSearchParams(next);
  };

  // Facets are scoped to the selected category so brand options stay relevant.
  useEffect(() => {
    apiClient
      .get('/products/facets', { params: category ? { categories: category } : {} })
      .then((res) => setFacets({ brands: res.data.brands, priceRange: res.data.priceRange }))
      .catch(() => setFacets({ brands: [], priceRange: { min: 0, max: 0 } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    setLoading(true);
    const params = { limit, sort, page };
    if (category) params.categories = category;
    if (search) params.search = search;
    if (onSale) params.onSale = 'true';
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (brands.length > 0) params.brand = brands.join(',');
    if (minRating) params.rating = minRating;

    apiClient
      .get('/products', { params })
      .then((res) => {
        setProducts(res.data.products || []);
        setProductCount(res.data.productCount || 0);
        setTotalPages(res.data.totalPages || 0);
      })
      .catch(() => {
        setProducts([]);
        setProductCount(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  }, [category, search, onSale, sort, minPrice, maxPrice, brands.join(','), minRating, page, limit]);

  const toggleBrand = (b) => {
    const next = brands.includes(b) ? brands.filter((x) => x !== b) : [...brands, b];
    updateParams({ brand: next });
  };

  // Windowed page list: first, last, current ±1, with '…' gaps between.
  const getPageList = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const withGaps = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) withGaps.push('…');
      withGaps.push(p);
    });
    return withGaps;
  };

  const activeFilters = [
    category && { key: 'category', label: categories.find((c) => c.slug === category)?.label, clear: () => updateParams({ category: '' }) },
    onSale && { key: 'onSale', label: 'On sale', clear: () => updateParams({ onSale: '' }) },
    minRating && {
      key: 'rating',
      label: `${minRating}★ & up`,
      clear: () => updateParams({ rating: '' }),
    },
    minPrice && { key: 'minPrice', label: `From ${formatKsh(minPrice)}`, clear: () => updateParams({ minPrice: '' }) },
    maxPrice && { key: 'maxPrice', label: `Up to ${formatKsh(maxPrice)}`, clear: () => updateParams({ maxPrice: '' }) },
    ...brands.map((b) => ({ key: `brand-${b}`, label: b, clear: () => toggleBrand(b) })),
  ].filter(Boolean);

  return (
    <div className='flex flex-col gap-6 pb-16 md:flex-row md:gap-8'>
      {/* A fixed, narrow rail rather than a quarter of the page: Jumia, Konga
          and Naivas all give filters ~240px and spend the rest on products.
          At `md:col-span-1` of a four-column grid this was 25% of a 1440px
          page — 350px of checkboxes beside the thing people came for. */}
      <aside className='hidden shrink-0 md:block md:w-56 lg:w-60'>
        <ProductFilters
          category={category}
          brands={brands}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onSale={onSale}
          minRating={minRating}
          facets={facets}
          onCategory={(slug) => updateParams({ category: slug, brand: [] })}
          onToggleBrand={toggleBrand}
          onPrice={({ min, max }) => updateParams({ minPrice: min, maxPrice: max })}
          onToggleSale={() => updateParams({ onSale: onSale ? '' : 'true' })}
          onRating={(value) => updateParams({ rating: value })}
        />
      </aside>

      <div className='min-w-0 flex-1'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-3'>
            {/* Below `md` the rail is gone, so the filters live behind a button
                with the count on it — the pattern all three use on a phone. */}
            <button
              type='button'
              onClick={() => setFiltersOpen(true)}
              className='flex items-center gap-1.5 rounded-md border border-dark-300 px-3 py-1.5 text-sm font-semibold text-dark-700 md:hidden'>
              <FiFilter size={14} />
              Filters
              {activeFilters.length > 0 && (
                <span className='rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white'>
                  {activeFilters.length}
                </span>
              )}
            </button>
            <p className='text-sm text-dark-500'>
              {loading ? 'Loading…' : `${productCount} products`}
              {search && (
                <>
                  {' '}for <span className='font-semibold text-dark-800'>"{search}"</span>
                </>
              )}
            </p>
          </div>

          {/* Sort sits over the results it reorders, not in the filter rail:
              it doesn't narrow anything, and all three shops put it here. */}
          <div className='flex items-center gap-3'>
            <label className='flex items-center gap-2 text-sm text-dark-500'>
              Sort
              <Select
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                options={[
                  { value: '-createdAt', label: 'Newest' },
                  { value: 'price', label: 'Price: Low to High' },
                  { value: '-price', label: 'Price: High to Low' },
                  { value: 'topRated', label: 'Top rated' },
                ]}
                className='w-44'
              />
            </label>
            <label className='hidden items-center gap-2 text-sm text-dark-500 sm:flex'>
              Show
              <Select
                value={limit}
                onChange={(e) => updateParams({ limit: e.target.value })}
                options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} per page` }))}
                className='w-36'
              />
            </label>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className='flex flex-wrap gap-2 mb-4'>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.clear}
                className='flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-primary-100'>
                {f.label}
                <FiX size={12} />
              </button>
            ))}
            <button
              onClick={() => setSearchParams(search ? { search } : {})}
              className='text-xs font-medium text-dark-500 hover:text-dark-800 px-2 py-1.5'>
              Clear all
            </button>
          </div>
        )}

        {loading ? (
          <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          // A dead end needs a way out. The filters that emptied the grid are
          // in a collapsed rail on desktop and behind a button on mobile, so
          // "no results" with no action left the shopper to work out for
          // themselves which of them to undo.
          <div className='flex flex-col items-center py-16 text-center'>
            <span className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-dark-100 text-dark-400'>
              <FiSearch size={22} />
            </span>
            <p className='font-heading text-lg font-bold text-dark-900'>No products found</p>
            <p className='mt-1.5 max-w-sm text-sm text-dark-500'>
              {search ? (
                <>
                  Nothing matches <span className='font-semibold text-dark-700'>"{search}"</span>
                  {activeFilters.length > 0 && ' with these filters'}.
                </>
              ) : (
                'Nothing matches these filters. Try widening them.'
              )}
            </p>
            {(activeFilters.length > 0 || search) && (
              <button
                type='button'
                onClick={() => setSearchParams({})}
                className='mt-6 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700'>
                Clear {search ? 'search and filters' : 'all filters'}
              </button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'>
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className='flex items-center justify-center gap-1.5 mt-10 flex-wrap'>
            <button
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) }, false)}
              className='px-3 py-1.5 text-sm rounded-md border border-dark-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dark-50'>
              Previous
            </button>

            {getPageList(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className='px-2 text-sm text-dark-400'>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => updateParams({ page: String(p) }, false)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`h-9 w-9 text-sm rounded-md tabular-nums ${
                    p === page
                      ? 'bg-primary-600 text-white font-semibold'
                      : 'border border-dark-300 text-dark-600 hover:bg-dark-50'
                  }`}>
                  {p}
                </button>
              )
            )}

            <button
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) }, false)}
              className='px-3 py-1.5 text-sm rounded-md border border-dark-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-dark-50'>
              Next
            </button>
          </div>
        )}
      </div>
      {/* Mobile filter drawer. Same panel as the rail, so a facet added there
          shows up here for free. */}
      {filtersOpen && (
        <div className='fixed inset-0 z-50 md:hidden'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setFiltersOpen(false)}
            aria-hidden='true'
          />
          <div className='absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-xl'>
            <div className='flex items-center justify-between border-b border-dark-200 px-4 py-3'>
              <h2 className='font-heading font-bold text-dark-900'>Filters</h2>
              <button
                type='button'
                onClick={() => setFiltersOpen(false)}
                aria-label='Close filters'
                className='p-1 text-dark-500 hover:text-dark-900'>
                <FiX size={20} />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto px-4 py-3'>
              <ProductFilters
                category={category}
                brands={brands}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onSale={onSale}
                minRating={minRating}
                facets={facets}
                onCategory={(slug) => updateParams({ category: slug, brand: [] })}
                onToggleBrand={toggleBrand}
                onPrice={({ min, max }) => updateParams({ minPrice: min, maxPrice: max })}
                onToggleSale={() => updateParams({ onSale: onSale ? '' : 'true' })}
                onRating={(value) => updateParams({ rating: value })}
              />
            </div>
            {/* Results update live behind the drawer, so this closes rather
                than "applies" — and says what you'll be looking at. */}
            <div className='border-t border-dark-200 p-4'>
              <button
                type='button'
                onClick={() => setFiltersOpen(false)}
                className='w-full rounded-md bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700'>
                Show {productCount} products
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
