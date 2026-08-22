import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingBag } from 'react-icons/fi';

import ProductCard from '../../components/ui/ProductCard.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';

/**
 * Saved products, at `/account/wishlist`.
 *
 * It reuses `ProductCard` rather than defining its own row: the heart on each
 * card is already the remove control, the Add to cart button already becomes a
 * quantity stepper, and a saved product that's gone out of stock says so in
 * the same words it used in the grid the shopper saved it from.
 */
const WishlistPage = () => {
  const { items, loading, count } = useWishlist();
  const { addItem } = useCart();

  // Only what can actually be bought. Adding an out-of-stock product would be
  // rejected at checkout by the stock reservation, which is a worse place to
  // discover it.
  const available = items.filter((item) => item.stock?.qty > 0);

  const addAll = () => available.forEach((item) => addItem(item, 1));

  if (loading) {
    return (
      <div className='pb-16'>
        <div className='mb-6 h-8 w-48 animate-pulse rounded-md bg-dark-100' />
        <div className='grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='h-80 animate-pulse rounded-lg bg-dark-100' />
          ))}
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className='flex flex-col items-center py-20 text-center'>
        <span className='mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-dark-100 text-dark-400'>
          <FiHeart size={26} />
        </span>
        <h1 className='font-heading text-xl font-bold text-dark-900'>
          Your wishlist is empty
        </h1>
        <p className='mt-2 max-w-sm text-sm text-dark-500'>
          Tap the heart on any product to keep it here — it'll be waiting on
          whichever device you sign in from.
        </p>
        <Link
          to='/products'
          className='mt-6 rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700'>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className='pb-16'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='font-heading text-2xl font-bold text-dark-900'>
            Wishlist{' '}
            <span className='text-base font-medium text-dark-500'>
              ({count} {count === 1 ? 'item' : 'items'})
            </span>
          </h1>
          <p className='mt-1 text-sm text-dark-500'>
            Saved to your account, not just this browser.
          </p>
        </div>

        {available.length > 0 && (
          <button
            type='button'
            onClick={addAll}
            className='flex items-center gap-2 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700'>
            <FiShoppingBag size={15} />
            Add {available.length === count ? 'all' : `${available.length} in stock`} to cart
          </button>
        )}
      </div>

      <div className='grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4'>
        {items.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
