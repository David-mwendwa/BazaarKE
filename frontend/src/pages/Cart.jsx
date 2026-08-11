import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiMinus, FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi';

import apiClient from '../api/apiClient.js';
import PromoCodeBox from '../components/cart/PromoCodeBox.jsx';
import { useCart } from '../context/CartContext.jsx';

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);

const Cart = () => {
  const { items, setQty, removeItem, clearCart, itemCount, subtotal, coupon, discount } =
    useCart();
  const [freeAbove, setFreeAbove] = useState(null);

  // The threshold comes from the same table the server charges from, so the
  // nudge below can't promise free delivery the checkout then charges for.
  useEffect(() => {
    apiClient
      .get('/shipping/rates')
      .then((res) => setFreeAbove(res.data.freeAbove))
      .catch(() => setFreeAbove(null));
  }, []);

  const payable = Math.max(0, subtotal - discount);
  const qualifiesForFreeDelivery = freeAbove !== null && payable >= freeAbove;
  const freeDeliveryShortfall =
    freeAbove !== null && payable < freeAbove ? freeAbove - payable : 0;

  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center py-20 text-center'>
        <span className='mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-dark-100 text-dark-400'>
          <FiShoppingCart size={26} />
        </span>
        <h1 className='font-heading text-xl font-bold text-dark-900'>Your cart is empty</h1>
        <p className='mt-2 max-w-sm text-sm text-dark-500'>
          Nothing here yet. Browse the catalogue and add something to get started.
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
      <div className='mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2'>
        <h1 className='font-heading text-2xl font-bold text-dark-900'>
          Your cart{' '}
          <span className='text-base font-medium text-dark-500'>
            ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
        </h1>
        <Link
          to='/products'
          className='flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline'>
          <FiArrowLeft size={15} />
          Continue shopping
        </Link>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8'>
        <div className='lg:col-span-2'>
          {/* One bordered surface with divided rows rather than a stack of
              separate cards: the rows belong to the same list, and four
              floating cards next to a summary panel read as four panels. */}
          <ul className='divide-y divide-dark-100 overflow-hidden rounded-lg border border-dark-200 bg-white'>
            {items.map((item) => {
              const unitPrice = item.specialPrice || item.price;

              return (
                <li key={item._id} className='flex gap-4 p-4'>
                  <Link to={`/product/${item._id}`} className='shrink-0'>
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className='h-20 w-20 rounded-md bg-dark-50 object-contain p-1 sm:h-24 sm:w-24'
                    />
                  </Link>

                  <div className='flex min-w-0 flex-1 flex-col'>
                    <div className='flex items-start justify-between gap-4'>
                      <Link
                        to={`/product/${item._id}`}
                        className='line-clamp-2 text-sm font-medium text-dark-800 hover:text-primary-700'>
                        {item.name}
                      </Link>
                      {/* The line total is what the shopper is actually
                          checking when they scan a cart — the old row showed
                          only the unit price, leaving them to multiply. */}
                      <span className='hidden shrink-0 font-semibold tabular-nums text-dark-900 sm:block'>
                        {formatKsh(unitPrice * item.qty)}
                      </span>
                    </div>

                    <p className='mt-1 text-xs text-dark-500 tabular-nums'>
                      {formatKsh(unitPrice)} each
                    </p>

                    <div className='mt-auto flex items-center justify-between gap-3 pt-3'>
                      <div className='flex items-center overflow-hidden rounded-md border border-dark-300'>
                        <button
                          type='button'
                          onClick={() => setQty(item._id, item.qty - 1)}
                          className='px-2.5 py-1.5 text-dark-600 hover:bg-dark-50 hover:text-primary-700'
                          aria-label={`Decrease quantity of ${item.name}`}>
                          <FiMinus size={14} />
                        </button>
                        <span className='w-8 text-center text-sm font-semibold tabular-nums'>
                          {item.qty}
                        </span>
                        <button
                          type='button'
                          onClick={() => setQty(item._id, item.qty + 1)}
                          className='px-2.5 py-1.5 text-dark-600 hover:bg-dark-50 hover:text-primary-700'
                          aria-label={`Increase quantity of ${item.name}`}>
                          <FiPlus size={14} />
                        </button>
                      </div>

                      <div className='flex items-center gap-3'>
                        <span className='font-semibold tabular-nums text-dark-900 sm:hidden'>
                          {formatKsh(unitPrice * item.qty)}
                        </span>
                        <button
                          type='button'
                          onClick={() => removeItem(item._id)}
                          className='flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-dark-500 transition-colors hover:bg-red-50 hover:text-red-600'
                          aria-label={`Remove ${item.name} from cart`}>
                          <FiTrash2 size={14} />
                          <span className='hidden sm:inline'>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type='button'
            onClick={clearCart}
            className='mt-3 text-xs font-medium text-dark-500 hover:text-red-600'>
            Clear cart
          </button>
        </div>

        <div className='lg:col-span-1'>
          <div className='rounded-lg border border-dark-200 bg-white p-5 lg:sticky lg:top-24'>
            <h2 className='font-heading text-lg font-bold text-dark-900'>Order summary</h2>

            <div className='mt-4 space-y-2 text-sm'>
              <div className='flex justify-between text-dark-600'>
                <span>
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className='tabular-nums'>{formatKsh(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className='flex justify-between font-medium text-green-700'>
                  <span>Discount ({coupon.code})</span>
                  <span className='tabular-nums'>−{formatKsh(discount)}</span>
                </div>
              )}

              {/* The delivery fee depends on the city, which this page has no
                  way to ask for — so it names the rule and defers the figure
                  rather than pretending it's zero. Unlike the old version of
                  this line, checkout really does calculate one now. */}
              <div className='flex justify-between text-dark-600'>
                <span>Delivery</span>
                <span className='text-right'>
                  {qualifiesForFreeDelivery ? (
                    <span className='font-medium text-green-700'>Free</span>
                  ) : (
                    'Calculated at checkout'
                  )}
                </span>
              </div>
            </div>

            {/* No tax row: these are Kenyan retail prices, quoted
                VAT-inclusive, so the tax isn't an addition to make — it's
                already in the figure, and the order is saved with
                `tax.amount: 0`. Stating that is accurate; a "VAT — Ksh 0" row
                would not be. */}
            <div className='mt-4 flex items-baseline justify-between border-t border-dark-200 pt-4'>
              <span className='font-semibold text-dark-900'>Total</span>
              <span className='font-heading text-xl font-bold tabular-nums text-dark-900'>
                {formatKsh(payable)}
              </span>
            </div>
            <p className='mt-1 text-right text-xs text-dark-500'>
              VAT included{qualifiesForFreeDelivery ? '' : ' · delivery added at checkout'}
            </p>

            {freeDeliveryShortfall > 0 && (
              // Concrete and checkable — it's the same threshold the server
              // applies, fetched from it rather than hardcoded here.
              <p className='mt-3 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800'>
                Spend {formatKsh(freeDeliveryShortfall)} more for free delivery.
              </p>
            )}

            <div className='mt-4 border-t border-dark-100 pt-4'>
              <PromoCodeBox />
            </div>

            <Link
              to='/checkout'
              className='mt-5 block w-full rounded-md bg-primary-600 py-3 text-center font-semibold text-white shadow-sm transition-colors hover:bg-primary-700'>
              Proceed to checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
