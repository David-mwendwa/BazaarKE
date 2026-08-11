import { Link } from 'react-router-dom';
import { FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { useCart } from '../../context/CartContext.jsx';
import { StarRating } from '../products/StarRating.jsx';
import WishlistButton from '../products/WishlistButton.jsx';

/**
 * Storefront product tile, matching the Naivas grid card:
 *
 *   "23% off" in plain accent text, top-left of the image
 *   → name over two lines
 *   → price in brand colour with the old price struck through beside it
 *   → "Save Ksh 351"
 *   → a full-width pill Add to cart that becomes a − qty + stepper in place
 *
 * Two deliberate departures from the screenshot:
 *
 *  - Their "Today's Deal" flag has no equivalent in this data. A badge every
 *    discounted product wore would say nothing, and there's no campaign field
 *    to drive a real one.
 *  - Prices stay `Ksh`, the app's format everywhere else (cart, checkout,
 *    orders), rather than switching this one surface to `KES`.
 *  - The button keeps `rounded-md` instead of their pill. Every radius in
 *    this app derives from the single `--radius` token, and one screen
 *    opting out of that would be the first crack in it.
 *
 * Everything above the button has a reserved height — a fixed image box, a
 * two-line name, a save line that stays even when there's nothing to save —
 * and the action block is pushed to the card's floor with `mt-auto`. Between
 * them, every card in a row lines up: same image baseline, same name baseline,
 * buttons flush along the bottom whatever the products are called.
 */

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);

const ProductCard = ({ product }) => {
  const { items, addItem, setQty } = useCart();
  const inCart = items.find((item) => item._id === product._id);

  const price = product.specialPrice || product.price;
  const onSale = product.specialPrice && product.specialPrice < product.price;
  const discount = onSale ? Math.round((1 - product.specialPrice / product.price) * 100) : 0;
  const saving = onSale ? product.price - product.specialPrice : 0;
  // `isInStock` is a virtual that reads `stock.status`; a product can carry
  // `in_stock` with nothing left on the shelf, which the order endpoint now
  // rejects. Trust the count when there is one.
  const outOfStock = !product.isInStock || product.stock?.qty === 0;
  const rating = product.rating;
  const lowStock =
    !outOfStock && typeof product.stock?.qty === 'number' && product.stock.qty <= 3;

  return (
    <div className='group relative flex h-full flex-col rounded-lg border border-dark-200 bg-white p-3 transition-shadow hover:shadow-card-hover'>
      {/* Outside the Link, so saving doesn't navigate. Always visible on
          touch, where there is no hover to reveal it. */}
      <WishlistButton product={product} className='absolute right-2 top-2 z-10' />

      <Link to={`/product/${product._id}`} className='relative block'>
        {/* Plain text, not a filled badge — the flag sits over the image's
            white space and a solid chip there would fight the packaging. */}
        {discount > 0 && (
          <span className='absolute left-0 top-0 z-10 text-xs font-medium text-secondary-600'>
            {discount}% off
          </span>
        )}

        {/* Fixed height, not an aspect ratio: every card's image box is then
            the same height whatever the card's width or the photo's shape, so
            the names below start on one line across the row. `object-contain`
            letterboxes a wide product inside it rather than cropping it. */}
        <div className='flex h-44 items-center justify-center overflow-hidden'>
          <img
            src={product.thumbnail}
            alt={product.name}
            loading='lazy'
            className='max-h-full max-w-full object-contain p-2'
          />
        </div>

        {outOfStock && (
          <span className='absolute bottom-2 left-0 rounded-full bg-dark-800 px-2.5 py-1 text-xs font-semibold text-white'>
            Out of stock
          </span>
        )}
      </Link>

      <Link
        to={`/product/${product._id}`}
        title={product.name}
        className='mt-1 line-clamp-2 min-h-[2.75rem] text-[15px] leading-snug text-dark-800 hover:text-primary-700'>
        {product.name}
      </Link>

      {/* Reserved whether or not the product has a rating, so the price line
          below starts on the same baseline across a row. Unrated products say
          so rather than showing five empty stars, which reads as zero out of
          five rather than "no one has said yet". */}
      <div className='mt-1.5 min-h-[1.125rem]'>
        {rating?.count > 0 ? (
          <StarRating value={rating.average} count={rating.count} size='sm' />
        ) : (
          <span className='text-xs text-dark-400'>No reviews yet</span>
        )}
      </div>

      <div className='mt-1'>
        <div className='flex flex-wrap items-baseline gap-x-2'>
          <span className='font-heading text-base font-bold text-primary-800'>{formatKsh(price)}</span>
          {onSale && (
            <span className='text-sm text-red-500 line-through'>{formatKsh(product.price)}</span>
          )}
        </div>
        {/* The saving spelled out in shillings under the price: the percentage
            tells you it's cheap, this tells you by how much. Reserved even
            when absent so the buttons line up across the row. */}
        {/* The saving, or — when stock is nearly gone — the scarcity, which is
            the more useful thing to know at that point. Both are facts from
            the record, not urgency copy: the count is the real one. */}
        <p className='mt-0.5 min-h-[1.125rem] text-xs text-dark-500'>
          {lowStock ? (
            <span className='font-medium text-secondary-700'>
              Only {product.stock.qty} left
            </span>
          ) : onSale ? (
            `Save ${formatKsh(saving)}`
          ) : (
            ''
          )}
        </p>
      </div>

      <div className='mt-auto pt-2.5'>
        {outOfStock ? (
          <button
            type='button'
            disabled
            className='w-full cursor-not-allowed rounded-md bg-dark-100 py-2.5 text-sm font-semibold text-dark-400'>
            Out of stock
          </button>
        ) : inCart ? (
          // In-cart, the button becomes the quantity control in place, so
          // adjusting never means opening the cart.
          <div className='flex items-center justify-between rounded-md border border-primary-600 bg-white'>
            <button
              type='button'
              onClick={() => setQty(product._id, inCart.qty - 1)}
              className='rounded-l-md px-4 py-2 text-dark-600 hover:text-primary-700'
              aria-label={`Remove one ${product.name}`}>
              <FiMinus size={16} />
            </button>
            <span className='text-sm font-semibold tabular-nums text-dark-800'>{inCart.qty}</span>
            <button
              type='button'
              onClick={() => setQty(product._id, inCart.qty + 1)}
              className='rounded-r-md px-4 py-2 text-dark-600 hover:text-primary-700'
              aria-label={`Add another ${product.name}`}>
              <FiPlus size={16} />
            </button>
          </div>
        ) : (
          <button
            type='button'
            onClick={() => addItem(product, 1)}
            className='flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-700'>
            <FiShoppingBag size={15} />
            Add to cart
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
