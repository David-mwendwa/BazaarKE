import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiShoppingCart, FiSearch, FiMenu, FiX, FiUser } from 'react-icons/fi';
import BrandLogo from './common/BrandLogo.jsx';
import UserMenu, { UserAvatar } from './common/UserMenu.jsx';
import { userMenuItems } from './common/userMenuItems.js';
import { displayName } from '../lib/user.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import CategoryMenu from './common/CategoryMenu.jsx';
import { useCategories } from '../hooks/useCategories.js';
import { formatCurrency } from '../lib/utils.js';

// How many categories sit directly in the row before the rest fall back to
// the "All categories" menu. Five is what fits beside the menu button and the
// two links on the right at `lg` without wrapping.
const INLINE_CATEGORIES = 5;

const Navbar = () => {
  const { categories } = useCategories();
  const { itemCount, subtotal } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // `null` means "on /products with no category" — that's the All products
  // entry. Off that page nothing in the row is current, hence `undefined`,
  // which matches no entry at all.
  const activeCategory =
    location.pathname === '/products' ? searchParams.get('category') : undefined;

  // Keep the search box in sync with the URL — landing on a shared search
  // link, or clearing it via a filter chip on /products, should reflect here.
  useEffect(() => {
    setQuery(location.pathname === '/products' ? searchParams.get('search') || '' : '');
  }, [location.pathname, searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setMenuOpen(false);
    }
  };

  // The category you're browsing is marked with an underline that meets the
  // band's bottom edge — the treatment Jumia and Konga both use, and quieter
  // than a row of pills, which turned six links into six competing buttons.
  // `null` is the "All products" entry, active on /products with no category.
  const categoryLinkClass = (slug) =>
    `flex h-full items-center border-b-2 px-1 font-medium transition-colors ${
      activeCategory === slug
        ? 'border-primary-600 text-primary-700'
        : 'border-transparent text-dark-600 hover:text-primary-700'
    }`;

  // Deals and New arrivals are current when /products carries their filter,
  // and share the category links' underline so the row has one active idiom.
  const promoLinkClass = (kind) => {
    const active =
      location.pathname === '/products' &&
      (kind === 'onSale'
        ? searchParams.get('onSale') === 'true'
        : searchParams.get('sort') === '-createdAt');

    return `flex h-full items-center border-b-2 px-1 font-medium transition-colors ${
      active ? 'border-primary-600 text-primary-700' : 'border-transparent text-dark-600 hover:text-primary-700'
    }`;
  };

  const mobileLinkClass = (slug) =>
    activeCategory === slug ? 'font-semibold text-primary-700' : 'font-medium text-dark-600';

  return (
    <header className='sticky top-0 z-40 bg-white border-b border-dark-200 shadow-sm'>
      <div className='max-w-page mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-16 gap-4'>
          <BrandLogo />

          {/* Search is the centre of the header on Jumia, Konga and Naivas
              alike: it takes all the room the row can spare and ends in a
              solid accent-coloured Search button rather than relying on the
              user to press Enter. That button is the single biggest thing
              separating a marketplace header from a blog's. */}
          <form onSubmit={handleSearch} className='hidden flex-1 md:flex'>
            <div className='group flex w-full'>
              <div className='relative flex-1'>
                <input
                  type='search'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Search products…'
                  aria-label='Search products'
                  className='w-full rounded-l-md border border-r-0 border-dark-300 bg-dark-50 py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:bg-white focus:outline-none'
                />
                <FiSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 transition-colors group-focus-within:text-primary-600' />
              </div>
              <button
                type='submit'
                className='rounded-r-md bg-primary-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'>
                Search
              </button>
            </div>
          </form>

          <div className='flex items-center gap-4 shrink-0'>
            {/* One control for everything account-shaped — profile, the
                dashboard for whichever role you are, orders, sign out —
                replacing the row of role-conditional links that used to sit
                here and had to be duplicated into the mobile panel. `md`
                matches the hamburger's breakpoint, so the dropdown and that
                panel are never both on screen. */}
            <div className='hidden md:block'>
              <UserMenu />
            </div>
            {/* Count on the badge, running total beside it — every one of the
                three shows what's in the basket *and* what it comes to, so the
                shopper never has to open the cart to find out. */}
            <Link
              to='/cart'
              aria-label={
                itemCount > 0
                  ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}, ${formatCurrency(subtotal)}`
                  : 'Cart, empty'
              }
              className='flex items-center gap-2 text-dark-700 hover:text-primary-700'>
              <span className='relative'>
                <FiShoppingCart size={22} />
                {itemCount > 0 && (
                  <span
                    aria-hidden='true'
                    className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-600 text-xs font-semibold text-white'>
                    {itemCount}
                  </span>
                )}
              </span>
              <span className='hidden text-left lg:block' aria-hidden='true'>
                <span className='block text-xs leading-tight text-dark-500'>Cart</span>
                <span className='block text-sm font-semibold leading-tight tabular-nums'>
                  {formatCurrency(subtotal)}
                </span>
              </span>
            </Link>
            <button
              className='md:hidden text-dark-700'
              onClick={() => setMenuOpen((v) => !v)}
              aria-label='Toggle menu'>
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

      </div>

      {/* Full-width band so the divider spans the viewport rather than
          stopping at the centred container — but the same white as the row
          above it. The grey fill made the header read as two stacked bars
          instead of one surface. */}
      <div className='hidden border-t border-dark-100 md:block'>
        <div className='mx-auto max-w-page px-4 sm:px-6 lg:px-8'>
          <nav className='flex h-11 items-center gap-6 text-sm'>
            <CategoryMenu activeCategory={activeCategory} />

            {/* A fixed handful inline; the rest live in the menu above. The
                row's height and shape stay the same whether the shop sells
                five categories or fifty. */}
            {categories.slice(0, INLINE_CATEGORIES).map((cat) => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                className={`hidden lg:flex ${categoryLinkClass(cat.slug)}`}>
                {cat.label}
              </Link>
            ))}

            {/* The right of the row belongs to the two edits of the catalogue
                a shopper actually asks for by name. Both are real filters on
                /products, not placeholders. */}
            <div className='ml-auto flex items-center gap-6'>
              <Link to='/products?onSale=true' className={promoLinkClass('onSale')}>
                <span className='mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-secondary-500' />
                Deals
              </Link>
              <Link to='/products?sort=-createdAt' className={promoLinkClass('new')}>
                New arrivals
              </Link>
            </div>
          </nav>
        </div>
      </div>

      {menuOpen && (
        <div className='md:hidden border-t border-dark-100 px-4 py-4 space-y-4'>
          <form onSubmit={handleSearch} className='group flex'>
            <div className='relative flex-1'>
              <input
                type='search'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search products…'
                aria-label='Search products'
                className='w-full rounded-l-md border border-r-0 border-dark-300 bg-dark-50 py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-primary-500 focus:bg-white focus:outline-none'
              />
              <FiSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 transition-colors group-focus-within:text-primary-600' />
            </div>
            <button
              type='submit'
              aria-label='Search'
              className='rounded-r-md bg-primary-600 px-4 text-white transition-colors hover:bg-primary-700'>
              <FiSearch size={18} />
            </button>
          </form>
          <div className='flex flex-col gap-3 text-sm'>
            <Link
              to='/products'
              onClick={() => setMenuOpen(false)}
              className={mobileLinkClass(null)}>
              All products
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/products?category=${cat.slug}`}
                onClick={() => setMenuOpen(false)}
                className={mobileLinkClass(cat.slug)}>
                {cat.label}
              </Link>
            ))}
            {/* The two shortcuts the desktop row keeps on its right. */}
            <Link
              to='/products?onSale=true'
              onClick={() => setMenuOpen(false)}
              className='flex items-center font-medium text-dark-600'>
              <span className='mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-secondary-500' />
              Deals
            </Link>
            <Link
              to='/products?sort=-createdAt'
              onClick={() => setMenuOpen(false)}
              className='font-medium text-dark-600'>
              New arrivals
            </Link>
            {/* Same items as the desktop dropdown, laid out flat — a menu
                inside a menu is worse than a list on a phone. */}
            {user ? (
              <div className='flex flex-col gap-3 border-t border-dark-100 pt-3'>
                <div className='flex items-center gap-2'>
                  <UserAvatar user={user} size='h-8 w-8' />
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-dark-900'>{displayName(user)}</p>
                    <p className='truncate text-xs text-dark-500'>{user.email}</p>
                  </div>
                </div>
                {userMenuItems(user).map((item) => {
                  const Icon = item.icon;
                  const className = `flex items-center gap-1.5 font-medium ${
                    item.danger ? 'text-red-600' : 'text-dark-600 hover:text-primary-700'
                  }`;

                  return item.action === 'logout' ? (
                    <button
                      key={item.label}
                      type='button'
                      className={`${className} text-left`}
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        navigate('/');
                      }}>
                      <Icon size={16} />
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={className}>
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Link
                to='/login'
                onClick={() => setMenuOpen(false)}
                className='flex items-center gap-1.5 text-dark-600 hover:text-primary-700 font-medium pt-3 border-t border-dark-100'>
                <FiUser size={16} />
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
