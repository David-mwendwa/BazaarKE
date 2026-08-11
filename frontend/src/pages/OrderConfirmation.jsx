import { useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { FiCheckCircle, FiMapPin, FiPackage } from 'react-icons/fi';

import { useCart } from '../context/CartContext.jsx';

/**
 * The receipt. It renders the order object Checkout hands over in navigation
 * state — the same one the API just returned, so the figures shown here are
 * the ones that were saved, not a client-side re-derivation of them.
 *
 * It used to show only the order number and two links, which meant the one
 * screen where a shopper checks what they just committed to was also the only
 * one in the purchase flow that didn't show it.
 *
 * There's no fetch fallback on refresh: navigation state doesn't survive one,
 * and `/account/orders` is the durable copy — the guard sends you home rather
 * than to a page pretending to be a receipt.
 */

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);

const PAYMENT_LABELS = {
  cash_on_delivery: 'Cash on delivery',
  mpesa: 'M-Pesa',
  card: 'Card',
  paypal: 'PayPal',
  bank_transfer: 'Bank transfer',
};

const OrderConfirmation = () => {
  const location = useLocation();
  const order = location.state?.order;
  const orderNumber = order?.orderNumber || location.state?.orderNumber;
  const { clearCart } = useCart();

  // Cleared here, once this page is mounted, rather than from Checkout —
  // clearing it there raced Checkout's own "cart is empty" render guard
  // and bounced the user back to /cart instead of landing here.
  useEffect(() => {
    if (orderNumber) clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (!orderNumber) {
    return <Navigate to='/' replace />;
  }

  const items = order?.items || [];
  const address = order?.shippingAddress;
  const discount = order?.discount?.amount || 0;
  const shipping = order?.shipping;

  return (
    <div className='mx-auto max-w-2xl pb-16 pt-8'>
      <div className='text-center'>
        <FiCheckCircle className='mx-auto mb-4 text-primary-600' size={48} />
        <h1 className='font-heading text-2xl font-bold text-dark-900'>Order placed</h1>
        <p className='mt-2 text-sm text-dark-500'>
          We'll get it packed and on its way. Order{' '}
          <span className='font-semibold tabular-nums text-dark-800'>{orderNumber}</span>.
        </p>
      </div>

      {order && (
        <div className='mt-8 overflow-hidden rounded-lg border border-dark-200 bg-white'>
          <ul className='divide-y divide-dark-100'>
            {items.map((item) => (
              <li key={item._id || item.product} className='flex items-center gap-4 p-4'>
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className='h-14 w-14 shrink-0 rounded-md bg-dark-50 object-contain p-1'
                />
                <div className='min-w-0 flex-1'>
                  <p className='line-clamp-2 text-sm font-medium text-dark-800'>{item.name}</p>
                  <p className='text-xs tabular-nums text-dark-500'>
                    {formatKsh(item.price?.amount)} × {item.quantity}
                  </p>
                </div>
                <p className='shrink-0 text-sm font-semibold tabular-nums text-dark-900'>
                  {formatKsh((item.price?.amount || 0) * (item.quantity || 0))}
                </p>
              </li>
            ))}
          </ul>

          <div className='space-y-2 border-t border-dark-200 bg-dark-50/50 p-4 text-sm'>
            <div className='flex justify-between text-dark-600'>
              <span>Subtotal</span>
              <span className='tabular-nums'>{formatKsh(order.subtotal?.amount)}</span>
            </div>
            {discount > 0 && (
              <div className='flex justify-between font-medium text-green-700'>
                <span>
                  Discount{order.discount?.code ? ` (${order.discount.code})` : ''}
                </span>
                <span className='tabular-nums'>−{formatKsh(discount)}</span>
              </div>
            )}
            <div className='flex justify-between text-dark-600'>
              <span>
                Delivery
                {shipping?.method && (
                  <span className='block text-xs text-dark-400'>{shipping.method}</span>
                )}
              </span>
              <span className='tabular-nums'>
                {shipping?.amount === 0 ? (
                  <span className='font-medium text-green-700'>Free</span>
                ) : (
                  formatKsh(shipping?.amount)
                )}
              </span>
            </div>
            <div className='flex items-baseline justify-between border-t border-dark-200 pt-2'>
              <span className='font-semibold text-dark-900'>Total</span>
              <span className='font-heading text-lg font-bold tabular-nums text-dark-900'>
                {formatKsh(order.total?.amount)}
              </span>
            </div>
            <p className='text-right text-xs text-dark-500'>VAT included</p>
          </div>
        </div>
      )}

      {order && (
        <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {address && (
            <div className='rounded-lg border border-dark-200 bg-white p-4'>
              <h2 className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dark-500'>
                <FiMapPin size={13} />
                Delivering to
              </h2>
              <p className='text-sm font-medium text-dark-800'>
                {address.firstName} {address.lastName}
              </p>
              <p className='text-sm text-dark-600'>
                {[address.address1, address.city, address.postalCode].filter(Boolean).join(', ')}
              </p>
              <p className='text-sm text-dark-500'>{address.phone}</p>
            </div>
          )}

          <div className='rounded-lg border border-dark-200 bg-white p-4'>
            <h2 className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dark-500'>
              <FiPackage size={13} />
              Payment
            </h2>
            <p className='text-sm font-medium text-dark-800'>
              {PAYMENT_LABELS[order.payment?.method] || 'Cash on delivery'}
            </p>
            <p className='text-sm text-dark-500'>
              {order.payment?.method === 'cash_on_delivery'
                ? 'Pay when your order arrives.'
                : `Payment ${order.payment?.status || 'pending'}.`}
            </p>
          </div>
        </div>
      )}

      <div className='mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row'>
        <Link
          to='/account/orders'
          className='w-full rounded-md bg-primary-600 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto'>
          Track this order
        </Link>
        <Link
          to='/products'
          className='w-full rounded-md border border-dark-300 px-6 py-3 text-center text-sm font-semibold text-dark-700 transition-colors hover:border-primary-500 hover:text-primary-700 sm:w-auto'>
          Continue shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
