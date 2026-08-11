import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronDown, FiGrid } from 'react-icons/fi';

import { useCategories } from '../../hooks/useCategories.js';

/**
 * "All categories" — the department menu Jumia, Konga and Naivas all anchor
 * the left of their category row with.
 *
 * It exists so the row doesn't have to grow with the catalogue. Listing every
 * category inline works at five and breaks at fifteen: the row either wraps
 * onto a second line or scrolls sideways, and either way the header's height
 * starts depending on how much the shop sells. Here the row shows a fixed
 * handful and this panel holds the full list, in columns, however long it gets.
 */
const CategoryMenu = ({ activeCategory }) => {
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (!wrapper.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  return (
    // Hover opens it, the way every department menu on a shop does — the click
    // handler stays for touch and for keyboard, where there is no hover. The
    // panel is a child of this element and starts at `top-full`, so moving the
    // pointer from the button into the list never crosses a gap that would
    // fire `mouseleave` and close it mid-reach.
    <div
      className='relative h-full'
      ref={wrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup='menu'
        className='flex h-full items-center gap-2 pr-2 text-sm font-semibold text-dark-800 hover:text-primary-700'>
        <FiGrid size={16} />
        All categories
        <FiChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role='menu'
          className='absolute left-0 top-full z-50 w-[28rem] rounded-b-lg border border-t-0 border-dark-200 bg-white p-2 shadow-lg'>
          {/* Two columns, so a long list grows downward at half the rate and
              the panel never becomes a scrolling ribbon. */}
          <div className='grid grid-cols-2 gap-0.5'>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                role='menuitem'
                to={`/products?category=${cat.slug}`}
                className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-dark-50 hover:text-primary-700 ${
                  activeCategory === cat.slug ? 'font-semibold text-primary-700' : 'text-dark-700'
                }`}>
                {cat.label}
              </Link>
            ))}
          </div>
          <div className='mt-1 border-t border-dark-100 pt-1'>
            <Link
              role='menuitem'
              to='/products'
              className='block rounded-md px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50'>
              Browse all products →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryMenu;
