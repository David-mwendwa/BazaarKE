import { FiHeart } from 'react-icons/fi';

import { useWishlist } from '../../context/WishlistContext.jsx';

/**
 * The heart. Two shapes from one component so the grid tile and the product
 * page can't drift: `icon` is the circular overlay on a card, `button` is the
 * labelled control beside Add to cart.
 *
 * Saved state is carried by the fill, not by colour alone — an outline heart
 * and a solid one differ in shape, so the state survives a greyscale screen or
 * a red/green colour deficiency.
 */
const WishlistButton = ({ product, variant = 'icon', className = '' }) => {
  const { has, toggle, isPending } = useWishlist();
  const saved = has(product._id);
  const busy = isPending(product._id);

  const handleClick = (e) => {
    // Cards wrap their image and title in a Link — without this, saving a
    // product also navigates away from the grid you were scanning.
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  };

  const label = saved ? 'Remove from wishlist' : 'Save to wishlist';

  if (variant === 'button') {
    return (
      <button
        type='button'
        onClick={handleClick}
        disabled={busy}
        aria-pressed={saved}
        className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          saved
            ? 'border-primary-600 bg-primary-50 text-primary-700'
            : 'border-dark-300 text-dark-700 hover:border-primary-500 hover:text-primary-700'
        } ${className}`}>
        <FiHeart size={16} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      className={`flex h-6 w-6 items-center justify-center rounded-full border border-dark-200 bg-white/90 backdrop-blur transition-colors disabled:opacity-60 sm:h-8 sm:w-8 ${
        saved ? 'text-red-500 hover:text-red-600' : 'text-dark-400 hover:text-red-500'
      } ${className}`}>
      <FiHeart size={12} className='sm:hidden' fill={saved ? 'currentColor' : 'none'} />
      <FiHeart size={16} className='hidden sm:block' fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
};

export default WishlistButton;
