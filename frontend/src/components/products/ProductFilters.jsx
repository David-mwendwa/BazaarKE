import { useEffect, useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

import { useCategories } from '../../hooks/useCategories.js';
import { StarRating } from './StarRating.jsx';

/**
 * The /products filter panel, shared by the desktop sidebar and the mobile
 * drawer so the two can't drift.
 *
 * Modelled on Jumia's sidebar, which is the fullest of the three shops we
 * looked at — collapsible sections, a brand checkbox list, min/max price
 * inputs with an Apply, and a "discounted items only" toggle. Konga and
 * Naivas are the same idea with fewer facets.
 *
 * Rating is here now. It was left out while no product carried one — the
 * review endpoints wrote to fields the schema doesn't have, so nothing was
 * ever recorded — and every star row would have returned an empty grid.
 *
 * What we still don't offer, because the data isn't there and a filter that
 * returns nothing is worse than no filter:
 *
 *  - **Colour, OS, screen size.** Jumia has attribute facets; our Product
 *    schema has no attribute bag to build them from.
 *  - **In stock.** All 901 are in stock, so the control would filter nothing.
 *    The API's `inStock=true` does work — its `$or` leads with
 *    `stock.status: 'in_stock'`, which every product has, and returns all 901.
 */

const FilterSection = ({ title, count, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className='border-b border-dark-200 py-4 first:pt-0 last:border-b-0'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className='flex w-full items-center justify-between text-left'>
        <span className='text-sm font-semibold text-dark-900'>
          {title}
          {count > 0 && (
            <span className='ml-2 rounded-full bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-700'>
              {count}
            </span>
          )}
        </span>
        <FiChevronDown
          size={16}
          className={`text-dark-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className='mt-3'>{children}</div>}
    </div>
  );
};

const ProductFilters = ({
  category,
  brands,
  minPrice,
  maxPrice,
  onSale,
  minRating,
  facets,
  onCategory,
  onToggleBrand,
  onPrice,
  onToggleSale,
  onRating,
}) => {
  const { categories } = useCategories();

  // Price is the one filter that shouldn't commit as you type — a partially
  // typed "5" from "50000" would fire a request for everything under Ksh 5.
  // It's local until Apply (or Enter), the way Jumia's is.
  const [draft, setDraft] = useState({ min: minPrice, max: maxPrice });
  const [brandQuery, setBrandQuery] = useState('');

  // Re-seed when the URL changes from outside the panel — a filter chip
  // dismissed above the grid, "Clear all", or the back button.
  useEffect(() => setDraft({ min: minPrice, max: maxPrice }), [minPrice, maxPrice]);

  const applyPrice = (e) => {
    e.preventDefault();
    onPrice({ min: draft.min, max: draft.max });
  };

  const matching = facets.brands.filter((b) =>
    b.toLowerCase().includes(brandQuery.trim().toLowerCase())
  );
  // Selected brands stay visible at the top: unchecking something you just
  // checked shouldn't mean scrolling a 44-item list to find it again.
  const orderedBrands = [
    ...matching.filter((b) => brands.includes(b)),
    ...matching.filter((b) => !brands.includes(b)),
  ];

  return (
    <div>
      <FilterSection title='Category'>
        <div className='flex flex-col gap-2 text-sm'>
          <button
            type='button'
            onClick={() => onCategory('')}
            className={`text-left ${
              !category ? 'font-semibold text-primary-700' : 'text-dark-600 hover:text-primary-700'
            }`}>
            All products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type='button'
              onClick={() => onCategory(cat.slug)}
              className={`text-left ${
                category === cat.slug
                  ? 'font-semibold text-primary-700'
                  : 'text-dark-600 hover:text-primary-700'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title='Price' count={(minPrice ? 1 : 0) + (maxPrice ? 1 : 0)}>
        {/* Two bounds, not one slider. A max-only slider can't express "over
            Ksh 50,000", and dragging for a precise figure on a range that runs
            to six digits is hopeless. */}
        <form onSubmit={applyPrice} className='flex items-center gap-2'>
          <input
            type='number'
            inputMode='numeric'
            min={0}
            value={draft.min}
            onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
            placeholder={String(Math.floor(facets.priceRange.min || 0))}
            aria-label='Minimum price'
            className='w-full rounded-md border border-dark-300 px-2 py-1.5 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          />
          <span className='text-dark-400'>–</span>
          <input
            type='number'
            inputMode='numeric'
            min={0}
            value={draft.max}
            onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
            placeholder={String(Math.ceil(facets.priceRange.max || 0))}
            aria-label='Maximum price'
            className='w-full rounded-md border border-dark-300 px-2 py-1.5 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          />
          <button
            type='submit'
            className='shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700'>
            Go
          </button>
        </form>
      </FilterSection>

      <FilterSection title='Offers' count={onSale ? 1 : 0}>
        <label className='flex cursor-pointer items-center gap-2 text-sm text-dark-600'>
          <input
            type='checkbox'
            checked={onSale}
            onChange={onToggleSale}
            className='rounded-md border-dark-300 text-primary-600 focus:ring-primary-500'
          />
          Discounted items only
        </label>
      </FilterSection>

      <FilterSection title='Rating' count={minRating ? 1 : 0}>
        {/* "& up", not a band: someone filtering for four stars wants the
            five-star products too. Clicking the active row clears it, so the
            control needs no separate reset. */}
        <div className='flex flex-col gap-1.5'>
          {[4, 3, 2].map((stars) => {
            const active = String(stars) === String(minRating);
            return (
              <button
                key={stars}
                type='button'
                onClick={() => onRating(active ? '' : String(stars))}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-colors ${
                  active ? 'bg-primary-50 font-semibold text-primary-700' : 'hover:bg-dark-50'
                }`}>
                <StarRating value={stars} size='sm' />
                <span className={active ? 'text-primary-700' : 'text-dark-600'}>&amp; up</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {facets.brands.length > 0 && (
        <FilterSection title='Brand' count={brands.length}>
          {/* A search box rather than Jumia's "show more": at 44 brands the
              list is long enough that typing beats scrolling, and it costs a
              row instead of a second click. */}
          {facets.brands.length > 8 && (
            <div className='relative mb-2'>
              <input
                type='search'
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder='Search brands'
                aria-label='Search brands'
                className='w-full rounded-md border border-dark-300 py-1.5 pl-8 pr-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
              />
              <FiSearch className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-400' size={14} />
            </div>
          )}

          <div className='flex max-h-56 flex-col gap-2 overflow-y-auto pr-1 text-sm'>
            {orderedBrands.length === 0 ? (
              <p className='text-dark-500'>No brands match "{brandQuery}"</p>
            ) : (
              orderedBrands.map((b) => (
                <label
                  key={b}
                  className='flex cursor-pointer items-center gap-2 text-dark-600 hover:text-dark-900'>
                  <input
                    type='checkbox'
                    checked={brands.includes(b)}
                    onChange={() => onToggleBrand(b)}
                    className='rounded-md border-dark-300 text-primary-600 focus:ring-primary-500'
                  />
                  {b}
                </label>
              ))
            )}
          </div>
        </FilterSection>
      )}
    </div>
  );
};

export default ProductFilters;
