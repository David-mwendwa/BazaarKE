import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheck,
  FiChevronDown,
  FiMinus,
  FiPlus,
  FiShare2,
  FiShoppingBag,
} from 'react-icons/fi';

import apiClient from '../api/apiClient.js';
import ProductCard from '../components/ui/ProductCard.jsx';
import ProductQA from '../components/products/ProductQA.jsx';
import ProductReviews from '../components/products/ProductReviews.jsx';
import { StarRating } from '../components/products/StarRating.jsx';
import WishlistButton from '../components/products/WishlistButton.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCategories } from '../hooks/useCategories.js';
import { sanitizeHtml } from '../lib/sanitizeHtml.js';

/**
 * Product detail page, laid out the way Jumia's is — the arrangement Konga
 * and Naivas also use, and the one shoppers here already know:
 *
 *   breadcrumb
 *   → gallery on the left, a sticky buy box on the right
 *   → a collapsible Description, full width below
 *   → more from the same category
 *
 * The Description header keeps Naivas' underlined tab styling even though
 * it's the only section.
 *
 * Ratings and reviews sit below the description. They were left out while the
 * review endpoints wrote to fields the schema doesn't have, so no product
 * could ever accumulate one; both halves work now.
 *
 * Still left out because the data isn't there — an empty section is worse than
 * no section, and a fabricated one is worse still:
 *
 *  - **Delivery fees, lead times and a returns window.** Jumia quotes pickup
 *    vs door prices per location and a returns policy per seller; we have no
 *    shipping table and no policy, per product or store-wide.
 *  - **Seller score.** No vendor metrics exist.
 *  - **Variant pickers.** Only 15 products carry `configurableOptions`.
 *  - **Warranty / returns policy.** Both fields are empty on every product.
 */

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);

// Below this, say how many are left: it's true, it's useful, and it's the one
// honest piece of urgency this data supports.
const LOW_STOCK = 5;

const ProductDetail = () => {
  const { categories } = useCategories();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    setActiveImage('');
    setQty(1);
    setAdded(false);
    setDescriptionOpen(true);
    apiClient
      .get(`/product/${id}`)
      .then((res) => setProduct(res.data.product))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  // "More from this category" is fetched separately so a slow or empty
  // recommendation query can never hold up the product itself.
  useEffect(() => {
    if (!product?.category) return;
    apiClient
      .get('/products', { params: { categories: product.category, limit: 8 } })
      .then((res) =>
        setRelated((res.data.products || []).filter((p) => p._id !== product._id).slice(0, 4))
      )
      .catch(() => setRelated([]));
  }, [product?.category, product?._id]);

  if (loading) return <p className='py-16 text-center text-dark-500'>Loading…</p>;
  if (!product)
    return (
      <div className='py-16 text-center'>
        <p className='mb-4 text-dark-500'>Product not found.</p>
        <Link to='/products' className='font-semibold text-primary-700 hover:underline'>
          Back to shop
        </Link>
      </div>
    );

  // Kept in `product` rather than in its own state so the review section can
  // hand back an updated average and the header follows it.
  const rating = product.rating;
  const price = product.specialPrice || product.price;
  const onSale = product.specialPrice && product.specialPrice < product.price;
  const discount = onSale ? Math.round((1 - product.specialPrice / product.price) * 100) : 0;
  const stockQty = product.stock?.qty ?? 0;
  const lowStock = product.isInStock && stockQty > 0 && stockQty <= LOW_STOCK;

  const categoryLabel = categories.find((c) => c.slug === product.category)?.label;
  const vendorName =
    product.vendor?.vendorInfo?.businessName ||
    `${product.vendor?.firstName || ''} ${product.vendor?.lastName || ''}`.trim();

  // The thumbnail always leads; gallery entries follow, de-duplicated in case
  // a vendor uploaded the same shot as both.
  const images = [
    product.thumbnail,
    ...(product.gallery || []).map((img) => img.full || img.thumbnail),
  ].filter((src, index, all) => src && all.indexOf(src) === index);

  const shown = activeImage || images[0];

  const share = async () => {
    const url = window.location.href;
    // The native sheet where there is one (phones), clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        /* dismissed — fall through to the clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; nothing useful to say about it */
    }
  };

  // The two buttons differ in where they leave you, and only that: both put
  // the item in the same cart. Add to cart keeps you on the page to carry on
  // shopping — hence the confirmation below it, since a click that changes
  // nothing on screen reads as a broken button. Buy now goes straight to
  // checkout for the shopper who came for this one thing.
  const addToCart = () => {
    addItem(product, qty);
    setAdded(true);
  };

  const buyNow = () => {
    addItem(product, qty);
    navigate('/checkout');
  };

  return (
    <div className='pb-16'>
      {/* Our own routes, not the `breadcrumbs` field on the product — that's
          scraped from the source catalogue and its paths don't exist here. */}
      <nav
        aria-label='Breadcrumb'
        className='mb-5 flex flex-wrap items-center gap-1.5 text-sm text-dark-500'>
        <Link to='/' className='hover:text-primary-700'>
          Home
        </Link>
        <span aria-hidden='true' className='text-dark-300'>
          /
        </span>
        {categoryLabel ? (
          <>
            <Link to={`/products?category=${product.category}`} className='hover:text-primary-700'>
              {categoryLabel}
            </Link>
            <span aria-hidden='true' className='text-dark-300'>
              /
            </span>
          </>
        ) : null}
        <span className='truncate text-dark-700'>{product.name}</span>
      </nav>

      {/* Flex, not a 12-column grid: the buy box is the fixed column and the
          gallery absorbs the rest, which is the split Jumia, Konga and Naivas
          all use. A buy box has a natural width — a line of copy and a button
          don't get better at 700px — while the photo is the thing worth the
          leftover space. On a grid both columns stretched together and the
          card grew as wide as the image.

          The image box is sized by height, not by aspect ratio: a full-width
          square in this column would stand over 900px on a large screen and
          push the price and buttons below the fold, on exactly the screens
          with room to spare. The height is set to what the photo needs and
          nothing more — stretching this card to match the buy box just left
          a tall band of empty white around the product. */}
      <div className='flex flex-col gap-6 lg:flex-row lg:gap-8'>
        <div className='min-w-0 flex-1'>
          <div className='relative flex h-[20rem] w-full items-center justify-center overflow-hidden rounded-lg border border-dark-200 bg-white sm:h-[24rem] lg:h-[26rem]'>
            {/* The discount sits on the image, where the eye lands first, so
                the price below only has to state the figures. */}
            {discount > 0 && (
              <span className='absolute left-4 top-4 rounded-md bg-secondary-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-dark-900'>
                {discount}% off
              </span>
            )}
            {/* Only enough padding to keep the photo off the border — the
                product should fill the box, not float in the middle of it. */}
            <img src={shown} alt={product.name} className='h-full w-full object-contain p-3' />
          </div>

          {images.length > 1 && (
            // Fixed-size thumbnails in a wrapping row, not a 6-column grid:
            // across a column this wide, six tracks made each thumbnail
            // bigger than it needs to be, and three images left half the row
            // empty.
            <ul className='mt-3 flex flex-wrap gap-2'>
              {images.map((src, index) => (
                <li key={src}>
                  <button
                    type='button'
                    onClick={() => setActiveImage(src)}
                    aria-label={`View image ${index + 1} of ${images.length}`}
                    aria-current={src === shown}
                    className={`h-20 w-20 overflow-hidden rounded-md border bg-white p-1.5 transition-all sm:h-24 sm:w-24 ${
                      src === shown
                        ? 'border-primary-600 ring-1 ring-primary-600'
                        : 'border-dark-200 hover:border-primary-300'
                    }`}>
                    <img src={src} alt='' loading='lazy' className='h-full w-full object-contain' />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className='lg:w-[22rem] lg:shrink-0 xl:w-[24rem]'>
          <div className='rounded-lg border border-dark-200 bg-white p-5 lg:sticky lg:top-24 lg:p-6'>
            {/* Brand and Share share the top line. Share used to sit in a row
                of its own at the foot of the card, which gave a secondary
                action the same weight as "Sold by". */}
            <div className='flex items-start justify-between gap-3'>
              {product.brand ? (
                // Real destination: the brand filter on /products, the same
                // one the sidebar checkboxes drive.
                <Link
                  to={`/products?brand=${encodeURIComponent(product.brand)}`}
                  className='text-xs font-bold uppercase tracking-widest text-primary-700 hover:underline'>
                  {product.brand}
                </Link>
              ) : (
                <span />
              )}
              <button
                type='button'
                onClick={share}
                aria-label='Share this product'
                className='-mt-1 flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-dark-500 transition-colors hover:bg-dark-50 hover:text-primary-700'>
                <FiShare2 size={14} />
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>

            <h1 className='mt-1 font-heading text-xl font-bold leading-snug text-dark-900 sm:text-2xl'>
              {product.name}
            </h1>

            {/* Straight under the name, and a link — the reviews are far
                enough down the page that a shopper who cares about them
                shouldn't have to go looking. */}
            {rating?.count > 0 && (
              <a
                href='#reviews'
                className='mt-2 inline-flex items-center gap-2 hover:underline'>
                <StarRating value={rating.average} size='md' />
                <span className='text-sm text-dark-600'>
                  {rating.average.toFixed(1)} · {rating.count} review
                  {rating.count === 1 ? '' : 's'}
                </span>
              </a>
            )}

            {/* Price and availability on one line. The price had a tinted
                panel to itself, which on the 886 products with no discount
                held a single number in a large empty box, while the stock
                state floated underneath as a stray coloured sentence. */}
            <div className='mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-y border-dark-100 py-4'>
              <div>
                <div className='flex flex-wrap items-baseline gap-x-2.5 gap-y-1'>
                  <span className='font-heading text-3xl font-bold tabular-nums text-dark-900'>
                    {formatKsh(price)}
                  </span>
                  {onSale && (
                    <span className='text-sm tabular-nums text-dark-400 line-through'>
                      {formatKsh(product.price)}
                    </span>
                  )}
                </div>
                {onSale && (
                  <p className='mt-1 text-sm font-medium text-primary-800'>
                    You save {formatKsh(product.price - product.specialPrice)}
                  </p>
                )}
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  !product.isInStock
                    ? 'bg-red-50 text-red-700'
                    : lowStock
                      ? 'bg-secondary-50 text-secondary-800'
                      : 'bg-green-50 text-green-700'
                }`}>
                {product.isInStock && <FiCheck size={13} />}
                {!product.isInStock
                  ? 'Out of stock'
                  : lowStock
                    ? `Only ${stockQty} left`
                    : 'In stock'}
              </span>
            </div>

            {product.isInStock && (
              <div className='mt-4 flex items-center justify-between gap-3'>
                <span className='text-sm text-dark-600'>Quantity</span>
                {/* A quantity control on the page itself: the old page could
                    only ever add one, so buying five meant five clicks here or
                    a trip to the cart to fix it. */}
                <div className='flex items-center rounded-md border border-dark-300'>
                  <button
                    type='button'
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label='Decrease quantity'
                    className='px-3 py-2 text-dark-600 hover:text-primary-700 disabled:opacity-40'>
                    <FiMinus size={14} />
                  </button>
                  <span className='w-10 text-center text-sm font-semibold tabular-nums'>{qty}</span>
                  <button
                    type='button'
                    onClick={() => setQty((q) => Math.min(stockQty || q + 1, q + 1))}
                    disabled={stockQty > 0 && qty >= stockQty}
                    aria-label='Increase quantity'
                    className='px-3 py-2 text-dark-600 hover:text-primary-700 disabled:opacity-40'>
                    <FiPlus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Side by side, both filling half the row. The label drops to
                `text-sm` here because "Add to cart" beside "Buy now" in a
                22rem column is tight — at the base size the icon and the text
                start colliding on the narrower of the two breakpoints. */}
            <div className='mt-5 flex gap-2.5'>
              <button
                type='button'
                disabled={!product.isInStock}
                onClick={addToCart}
                className='flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-600 px-3 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-dark-200 disabled:text-dark-400 disabled:shadow-none'>
                <FiShoppingBag size={16} className='shrink-0' />
                {product.isInStock ? 'Add to cart' : 'Out of stock'}
              </button>
              {product.isInStock && (
                <button
                  type='button'
                  onClick={buyNow}
                  className='flex flex-1 items-center justify-center gap-2 rounded-md border border-primary-600 px-3 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50'>
                  Buy now
                  <FiArrowRight size={16} className='shrink-0' />
                </button>
              )}
            </div>

            {/* Full width under the two buy actions rather than competing with
                them for the row: saving for later is a different decision from
                buying now, and it's the one people reach for when they've
                decided *not* to press the other two. */}
            <WishlistButton product={product} variant='button' className='mt-2.5 w-full' />

            {/* Says what just happened and offers the next step, rather than
                leaving the shopper to guess whether the click registered. */}
            {added && (
              <p
                role='status'
                className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800'>
                <FiCheck size={15} className='shrink-0' />
                Added to your cart.
                <Link to='/cart' className='font-semibold underline'>
                  View cart
                </Link>
              </p>
            )}

            {/* No delivery/returns/payment reassurances here. Every version
                of that list was a promise the shop can't keep: there's no
                shipping table behind a stated lead time, no returns policy
                behind a stated window, and Checkout currently completes on
                one method only. Add them back when the terms are real. */}
            {/* The card's small print: who you're buying from, and the code
                you'd quote if you ever had to ask about this exact item. SKU
                used to sit under the title, where it competed with the name
                for the first thing you read. */}
            {(vendorName || product.sku) && (
              <dl className='mt-5 space-y-1.5 border-t border-dark-100 pt-4 text-sm'>
                {vendorName && (
                  <div className='flex gap-2'>
                    <dt className='text-dark-500'>Sold by</dt>
                    <dd className='font-semibold text-dark-800'>{vendorName}</dd>
                  </div>
                )}
                {product.sku && (
                  <div className='flex gap-2'>
                    <dt className='text-dark-500'>SKU</dt>
                    <dd className='tabular-nums text-dark-600'>{product.sku}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      </div>

      {/* One collapsible section, kept open by default. Scraped descriptions
          run long — some of these are a full spec sheet — and collapsing it
          lets a shopper who's read enough get to the related products without
          scrolling past all of it. */}
      <section className='mt-12'>
        <div className='border-b border-dark-200'>
          <button
            type='button'
            onClick={() => setDescriptionOpen((v) => !v)}
            aria-expanded={descriptionOpen}
            aria-controls='product-description'
            className='flex w-full items-center justify-between gap-4 pb-3 text-left'>
            <span className='border-b-2 border-primary-600 pb-3 font-heading text-base font-bold text-dark-900 sm:text-lg'>
              Description
            </span>
            <FiChevronDown
              size={20}
              className={`shrink-0 text-dark-400 transition-transform ${
                descriptionOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {descriptionOpen && (
          <div id='product-description' className='max-w-3xl pt-6'>
            {product.shortDescription && (
              <div
                className='prose prose-sm max-w-none text-dark-700'
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.shortDescription) }}
              />
            )}
            {product.description && (
              <div
                className={`prose prose-sm max-w-none text-dark-600 ${
                  product.shortDescription ? 'mt-6 border-t border-dark-100 pt-6' : ''
                }`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
              />
            )}
            {!product.shortDescription && !product.description && (
              <p className='text-sm text-dark-500'>
                No description has been added for this product yet.
              </p>
            )}
          </div>
        )}
      </section>

      <div id='reviews' className='mt-12 scroll-mt-28'>
        <ProductReviews
          productId={product._id}
          onRatingChange={(next) => setProduct((p) => (p ? { ...p, rating: next } : p))}
        />
      </div>

      {/* Questions after reviews: reviews are what most shoppers came down
          here for, and a Q&A thread above them would push them below the
          fold. */}
      <div id='questions' className='scroll-mt-28'>
        <ProductQA productId={product._id} vendorId={product.vendor?._id} />
      </div>

      {related.length > 0 && (
        <section className='mt-12 border-t border-dark-200 pt-8'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-heading text-lg font-bold text-dark-900'>
              More in {categoryLabel || 'this category'}
            </h2>
            <Link
              to={`/products?category=${product.category}`}
              className='text-sm font-semibold text-primary-700 hover:underline'>
              See all →
            </Link>
          </div>
          <div className='grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 xl:grid-cols-4'>
            {related.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
