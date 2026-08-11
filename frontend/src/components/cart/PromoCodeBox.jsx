import { useEffect, useState } from 'react';
import { FiCheck, FiTag, FiX } from 'react-icons/fi';

import apiClient from '../../api/apiClient.js';
import { useCart } from '../../context/CartContext.jsx';

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);

const describe = (coupon) => {
  const off =
    coupon.type === 'percent' ? `${coupon.value}% off` : `${formatKsh(coupon.value)} off`;
  const cap =
    coupon.type === 'percent' && coupon.maxDiscount > 0
      ? ` (max ${formatKsh(coupon.maxDiscount)})`
      : '';
  return off + cap;
};

/**
 * Promo code entry, shared by the cart and the checkout summary so the two
 * can't disagree about what's applied. The code itself lives in CartContext,
 * which re-quotes it against the server whenever the basket changes.
 */
const PromoCodeBox = () => {
  const { coupon, subtotal, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState([]);

  // Only the codes marked public in the admin screen, already filtered
  // server-side to ones that are live and not exhausted.
  useEffect(() => {
    apiClient
      .get('/coupons/public')
      .then((res) => setAvailable(res.data.coupons || []))
      .catch(() => setAvailable([]));
  }, []);

  const apply = async (value) => {
    setBusy(true);
    setError('');
    const result = await applyCoupon(value);
    setBusy(false);

    if (result.ok) setCode('');
    else setError(result.message);
  };

  const submit = (e) => {
    e.preventDefault();
    if (code.trim()) apply(code.trim());
  };

  // The applied chip replaces the *input*, not the whole component. It used
  // to return early, which hid the available-codes list the moment any code
  // was applied — including a code left over in localStorage from a previous
  // visit, so a returning shopper could never see what else was on offer.
  const others = available.filter((item) => item.code !== coupon?.code);

  return (
    <form onSubmit={submit}>
      <label
        htmlFor='promo'
        className='mb-1.5 flex items-center gap-1.5 text-xs font-medium text-dark-600'>
        <FiTag size={13} />
        Promo code
      </label>

      {coupon ? (
        <div className='flex items-center justify-between gap-3 rounded-md bg-green-50 px-3 py-2.5'>
          <span className='flex min-w-0 items-center gap-2 text-sm text-green-800'>
            <FiCheck size={15} className='shrink-0' />
            <span className='truncate font-semibold'>{coupon.code}</span>
            applied
          </span>
          <button
            type='button'
            onClick={removeCoupon}
            aria-label={`Remove promo code ${coupon.code}`}
            className='shrink-0 rounded-md p-1 text-green-700 hover:bg-green-100'>
            <FiX size={16} />
          </button>
        </div>
      ) : (
        <div className='flex gap-2'>
          <input
            id='promo'
            value={code}
            // Uppercased on the way in, because that's how they're stored and
            // how they're printed on a campaign — a lowercase box makes a
            // matching code look like a different one.
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder='Enter code'
            className='min-w-0 flex-1 rounded-md border border-dark-300 px-3 py-2 text-sm uppercase tracking-wide transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          />
          <button
            type='submit'
            disabled={busy || !code.trim()}
            className='shrink-0 rounded-md border border-primary-600 px-4 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50 disabled:border-dark-200 disabled:text-dark-400'>
            {busy ? 'Checking…' : 'Apply'}
          </button>
        </div>
      )}

      {error && <p className='mt-1.5 text-xs text-red-600'>{error}</p>}

      {others.length > 0 && (
        <>
          <p className='mt-3 text-xs font-medium text-dark-500'>
            {coupon ? 'Other codes available' : 'Available codes'}
          </p>
          <ul className='mt-1.5 space-y-1.5'>
            {others.map((item) => {
              // Shown rather than hidden when the basket is too small: "spend
              // Ksh 8,000 more" is worth knowing, and a code that silently
              // disappears looks like it stopped existing.
              const shortfall = item.minSpend > 0 ? item.minSpend - subtotal : 0;
              const eligible = shortfall <= 0;

              return (
                <li key={item.code}>
                  <button
                    type='button'
                    disabled={!eligible || busy}
                    onClick={() => apply(item.code)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-left transition-colors ${
                      eligible
                        ? 'border-primary-300 bg-primary-50/50 hover:border-primary-500 hover:bg-primary-50'
                        : 'cursor-not-allowed border-dark-200 bg-dark-50/60'
                    }`}>
                    <span className='min-w-0'>
                      <span
                        className={`block font-mono text-xs font-bold uppercase ${
                          eligible ? 'text-primary-800' : 'text-dark-500'
                        }`}>
                        {item.code}
                      </span>
                      <span className='block text-xs text-dark-500'>
                        {eligible
                          ? item.description || describe(item)
                          : `Spend ${formatKsh(shortfall)} more to use this`}
                      </span>
                    </span>
                    {eligible && (
                      <span className='shrink-0 text-xs font-semibold text-primary-700'>Apply</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </form>
  );
};

export default PromoCodeBox;
