import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FiSmartphone, FiCreditCard, FiTruck, FiCheck } from 'react-icons/fi';
import apiClient from '../api/apiClient.js';
import PromoCodeBox from '../components/cart/PromoCodeBox.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Loaded once per app load, outside the component, per Stripe.js guidance.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const cardElementOptions = {
  style: {
    base: {
      fontSize: '14px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
};

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);

const STEPS = ['Cart', 'Delivery', 'Payment'];

/**
 * Labelled text input. The form used to be placeholder-only, which reads fine
 * empty and badly once filled — a screen of values with no idea which is the
 * postal code and which the phone. `autoComplete` is set per field so the
 * browser can fill an address it already knows.
 */
const Field = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className='mb-1.5 block text-xs font-medium text-dark-600'>
      {label}
    </label>
    <input
      id={id}
      className='w-full rounded-md border border-dark-300 px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
      {...props}
    />
  </div>
);

const PaymentOption = ({ icon: Icon, title, note, checked, disabled, onSelect, children }) => (
  <label
    className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
      disabled
        ? 'cursor-not-allowed border-dark-200 bg-dark-50/60'
        : `cursor-pointer ${
            checked
              ? 'border-primary-600 bg-primary-50/40 ring-1 ring-primary-600'
              : 'border-dark-200 hover:border-primary-300'
          }`
    }`}>
    <input
      type='radio'
      name='payment'
      disabled={disabled}
      checked={checked}
      onChange={onSelect}
      className='mt-0.5 text-primary-600 focus:ring-primary-500'
    />
    <Icon
      size={20}
      className={`mt-0.5 shrink-0 ${disabled ? 'text-dark-400' : 'text-primary-700'}`}
    />
    <div className='min-w-0 flex-1'>
      <p className={`text-sm font-semibold ${disabled ? 'text-dark-500' : 'text-dark-900'}`}>
        {title}
      </p>
      <p className='text-xs text-dark-500'>{note}</p>
      {children}
    </div>
  </label>
);

// A saved address carries fields the checkout form doesn't ask for (company,
// state, a label); this narrows one to what the form and the order need.
const toFormAddress = (item) => ({
  firstName: item.firstName || '',
  lastName: item.lastName || '',
  address1: [item.address1, item.address2].filter(Boolean).join(', '),
  city: item.city || '',
  postalCode: item.postalCode || '',
  phone: item.phone || '',
});

// Matches the seeded demo login accounts — lets a reviewer click through
// checkout without typing a fake address by hand.
const DEMO_ADDRESS = {
  address1: '14 Riverside Drive',
  city: 'Nairobi',
  postalCode: '00100',
  phone: '0712345678',
};

const Checkout = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);

const CheckoutForm = () => {
  const { items, itemCount, subtotal, coupon, discount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    address1: '',
    city: '',
    postalCode: '',
    phone: '',
  });
  // `selectedAddressId` is the id of a saved address, or `null` for "deliver
  // somewhere else" — which is also the state before anything has loaded, so
  // a shopper with no address book sees the plain form and nothing flickers.
  const [saved, setSaved] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [shippingQuote, setShippingQuote] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/payments/config')
      .then((res) => setPaymentConfig(res.data.config))
      .catch(() => setPaymentConfig({}));
  }, []);

  // Load the address book and preselect the default, so the common case is
  // "confirm" rather than "retype the address you gave us last week".
  useEffect(() => {
    if (!user) return;

    apiClient
      .get('/me/addresses')
      .then((res) => {
        const list = res.data.addresses || [];
        setSaved(list);

        const preferred = list.find((a) => a.isDefault) || list[0];
        if (preferred) {
          setSelectedAddressId(preferred._id);
          setAddress(toFormAddress(preferred));
        }
      })
      .catch(() => setSaved([]));
  }, [user]);

  const selectSavedAddress = (item) => {
    setSelectedAddressId(item._id);
    setAddress(toFormAddress(item));
  };

  const startNewAddress = () => {
    setSelectedAddressId(null);
    setAddress({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      address1: '',
      city: '',
      postalCode: '',
      phone: '',
    });
  };

  // Quote the delivery fee from the server rather than reimplementing the
  // zone table here — `newOrder` charges from that same table, so a copy in
  // the frontend would be a second source of truth waiting to drift. Empty
  // city means no quote yet: the summary says so instead of showing zero.
  useEffect(() => {
    if (!address.city.trim()) {
      setShippingQuote(null);
      return undefined;
    }

    let cancelled = false;
    apiClient
      .get('/shipping/quote', {
        params: { city: address.city, subtotal: Math.max(0, subtotal - discount) },
      })
      .then((res) => !cancelled && setShippingQuote(res.data))
      .catch(() => !cancelled && setShippingQuote(null));

    return () => {
      cancelled = true;
    };
  }, [address.city, subtotal, discount]);

  if (items.length === 0) {
    return <Navigate to='/cart' replace />;
  }

  const mpesaAvailable = Boolean(paymentConfig?.mpesaShortcode);
  const cardAvailable = Boolean(paymentConfig?.stripePublishableKey);

  const addressComplete =
    address.firstName && address.lastName && address.address1 && address.city && address.phone;

  // Mirrors the server's arithmetic in `newOrder`: discount off the subtotal,
  // then delivery on top. Display only — the figure that gets saved is the
  // one the server computes.
  const orderTotal = Math.max(0, subtotal - discount) + (shippingQuote?.amount || 0);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      if (paymentMethod === 'card' && (!stripe || !elements)) {
        throw new Error('Payment form is still loading — please try again in a moment.');
      }

      // Only the products, their quantities, the address and the code. The
      // server rebuilds line prices from the catalogue and recomputes the
      // subtotal, the discount, the delivery fee and the total — this page
      // used to post its own `subtotal` and `total`, which the API took at
      // face value.
      const res = await apiClient.post('/orders', {
        items: items.map((item) => ({ product: item._id, quantity: item.qty })),
        couponCode: coupon?.code,
        shippingAddress: { ...address, country: 'Kenya' },
        payment: { method: paymentMethod },
      });

      const order = res.data.data;

      // Saved after the order succeeds, and never allowed to break it: a
      // failure to file the address away is not a reason to tell someone
      // their order didn't go through.
      if (user && selectedAddressId === null && saveNewAddress) {
        apiClient.post('/me/addresses', address).catch(() => {});
      }

      if (paymentMethod === 'card') {
        const { paymentMethod: stripePaymentMethod, error: pmError } = await stripe.createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement),
        });
        if (pmError) throw new Error(pmError.message);

        const payRes = await apiClient.post('/payments/card', {
          orderId: order._id,
          paymentMethodId: stripePaymentMethod.id,
        });

        // Confirms immediately if Stripe already settled the intent server-side;
        // only prompts the customer when 3D-Secure is actually required.
        if (payRes.data.clientSecret) {
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            payRes.data.clientSecret
          );
          if (confirmError) throw new Error(confirmError.message);
          if (paymentIntent.status !== 'succeeded') {
            throw new Error('Card payment was not completed.');
          }
        }
      } else if (paymentMethod === 'mpesa') {
        await apiClient.post('/payments/mpesa', {
          orderId: order._id,
          phone: address.phone,
        });
      }

      // Cart is cleared on the confirmation page itself, not here — as long
      // as CheckoutForm is still mounted, its "cart is empty" guard above
      // will catch an empty cart and bounce to /cart before this
      // navigation is ever committed.
      toast.success(`Order ${order.orderNumber} placed!`);
      // The whole order, not just its number: the confirmation page renders
      // the figures the server saved rather than re-deriving them from a
      // cart it's about to clear.
      navigate('/order-confirmation', { state: { order }, replace: true });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Could not place your order. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className='pb-16'>
      <h1 className='mb-6 font-heading text-2xl font-bold text-dark-900'>Checkout</h1>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8'>
        <div className='lg:col-span-2'>
          {/* Numbered while pending, ticked once passed, so the row reports
              progress rather than just position. Steps behind you are
              clickable — the only way back used to be the Back button, one
              step at a time. */}
          <ol className='mb-6 flex items-center'>
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;

              return (
                <li key={label} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <button
                    type='button'
                    onClick={() => done && setStep(i)}
                    disabled={!done}
                    aria-current={current ? 'step' : undefined}
                    className={`flex items-center gap-2 ${done ? 'cursor-pointer' : 'cursor-default'}`}>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        done
                          ? 'bg-primary-100 text-primary-700'
                          : current
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-100 text-dark-400'
                      }`}>
                      {done ? <FiCheck size={16} /> : i + 1}
                    </span>
                    <span
                      className={`hidden text-sm font-medium sm:inline ${
                        current ? 'text-dark-900' : done ? 'text-dark-600' : 'text-dark-400'
                      }`}>
                      {label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      className={`mx-3 h-px flex-1 ${done ? 'bg-primary-300' : 'bg-dark-200'}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <div className='rounded-lg border border-dark-200 bg-white p-5 sm:p-6'>
            {step === 0 && (
              <>
                <div className='mb-4 flex items-center justify-between gap-4'>
                  <h2 className='font-heading text-lg font-bold text-dark-900'>Review your items</h2>
                  <Link to='/cart' className='text-sm font-medium text-primary-700 hover:underline'>
                    Edit cart
                  </Link>
                </div>
                <ul className='divide-y divide-dark-100'>
                  {items.map((item) => (
                    <li key={item._id} className='flex items-center gap-4 py-3 first:pt-0'>
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className='h-14 w-14 shrink-0 rounded-md bg-dark-50 object-contain p-1'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='line-clamp-2 text-sm font-medium text-dark-800'>{item.name}</p>
                        <p className='text-xs text-dark-500 tabular-nums'>
                          {formatKsh(item.specialPrice || item.price)} × {item.qty}
                        </p>
                      </div>
                      <p className='shrink-0 text-sm font-semibold tabular-nums text-dark-900'>
                        {formatKsh((item.specialPrice || item.price) * item.qty)}
                      </p>
                    </li>
                  ))}
                </ul>
                <button
                  type='button'
                  onClick={() => setStep(1)}
                  className='mt-5 w-full rounded-md bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto sm:px-8'>
                  Continue to delivery
                </button>
              </>
            )}

            {step === 1 && (
              // A real form, so Enter submits instead of doing nothing — the
              // fields used to sit loose in a div with the same handler only
              // reachable by clicking the button.
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (addressComplete) setStep(2);
                }}>
                <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                  <h2 className='font-heading text-lg font-bold text-dark-900'>Delivery address</h2>
                  {saved.length === 0 && (
                    <button
                      type='button'
                      onClick={() =>
                        setAddress((prev) => ({
                          ...prev,
                          firstName: prev.firstName || 'Demo',
                          lastName: prev.lastName || 'Customer',
                          ...DEMO_ADDRESS,
                        }))
                      }
                      className='rounded-md border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100'>
                      Fill demo address
                    </button>
                  )}
                </div>

                {/* Saved addresses as radio cards, the default preselected, so
                    a returning shopper confirms rather than retypes. Managing
                    them stays at /account/addresses — this is for picking. */}
                {saved.length > 0 && (
                  <div className='mb-5 space-y-2'>
                    {saved.map((item) => (
                      <label
                        key={item._id}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                          selectedAddressId === item._id
                            ? 'border-primary-600 bg-primary-50/40 ring-1 ring-primary-600'
                            : 'border-dark-200 hover:border-primary-300'
                        }`}>
                        <input
                          type='radio'
                          name='saved-address'
                          className='mt-1 text-primary-600 focus:ring-primary-500'
                          checked={selectedAddressId === item._id}
                          onChange={() => selectSavedAddress(item)}
                        />
                        <span className='min-w-0 text-sm'>
                          <span className='flex flex-wrap items-center gap-2'>
                            <span className='font-semibold text-dark-900'>
                              {item.firstName} {item.lastName}
                            </span>
                            <span className='rounded-full bg-dark-100 px-2 py-0.5 text-xs capitalize text-dark-600'>
                              {item.type || 'home'}
                            </span>
                            {item.isDefault && (
                              <span className='rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700'>
                                Default
                              </span>
                            )}
                          </span>
                          <span className='mt-0.5 block text-dark-600'>
                            {[item.address1, item.city, item.postalCode].filter(Boolean).join(', ')}
                          </span>
                          <span className='block text-dark-500'>{item.phone}</span>
                        </span>
                      </label>
                    ))}

                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors ${
                        selectedAddressId === null
                          ? 'border-primary-600 bg-primary-50/40 ring-1 ring-primary-600'
                          : 'border-dark-200 hover:border-primary-300'
                      }`}>
                      <input
                        type='radio'
                        name='saved-address'
                        className='text-primary-600 focus:ring-primary-500'
                        checked={selectedAddressId === null}
                        onChange={startNewAddress}
                      />
                      <span className='font-medium text-dark-800'>Deliver somewhere else</span>
                    </label>
                  </div>
                )}

                {selectedAddressId === null && (
                  <>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <Field
                      id='firstName'
                      label='First name'
                      autoComplete='given-name'
                      value={address.firstName}
                      onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                    />
                    <Field
                      id='lastName'
                      label='Last name'
                      autoComplete='family-name'
                      value={address.lastName}
                      onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                    />
                    <div className='sm:col-span-2'>
                      <Field
                        id='address1'
                        label='Street address'
                        autoComplete='address-line1'
                        value={address.address1}
                        onChange={(e) => setAddress({ ...address, address1: e.target.value })}
                      />
                    </div>
                    <Field
                      id='city'
                      label='City'
                      autoComplete='address-level2'
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                    <Field
                      id='postalCode'
                      label='Postal code (optional)'
                      autoComplete='postal-code'
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    />
                    <div className='sm:col-span-2'>
                      <Field
                        id='phone'
                        label='Phone number'
                        type='tel'
                        autoComplete='tel'
                        placeholder='07XX XXX XXX'
                        value={address.phone}
                        onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Checked by default: someone typing an address into a shop
                      they're signed into almost always wants it back next time,
                      and the address book is one click away to remove it. */}
                  {user && (
                    <label className='mt-4 flex items-center gap-2 text-sm text-dark-600'>
                      <input
                        type='checkbox'
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                        className='rounded-md border-dark-300 text-primary-600 focus:ring-primary-500'
                      />
                      Save this address for next time
                    </label>
                  )}
                  </>
                )}

                <div className='mt-6 flex items-center justify-between gap-3'>
                  <button
                    type='button'
                    onClick={() => setStep(0)}
                    className='text-sm font-medium text-dark-600 hover:text-dark-900'>
                    Back
                  </button>
                  <button
                    type='submit'
                    disabled={!addressComplete}
                    className='rounded-md bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-200 disabled:text-dark-400'>
                    Continue to payment
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <>
                <h2 className='mb-4 font-heading text-lg font-bold text-dark-900'>Payment</h2>

                {/* What you're about to commit to, restated where you commit
                    to it. Confirming an order without the address in view
                    means trusting that two steps ago went right. */}
                <div className='mb-5 flex flex-wrap items-start justify-between gap-2 rounded-md bg-dark-50 px-4 py-3 text-sm'>
                  <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-dark-500'>
                      Delivering to
                    </p>
                    <p className='mt-0.5 text-dark-800'>
                      {address.firstName} {address.lastName} — {address.address1}, {address.city}
                    </p>
                    <p className='text-dark-500'>{address.phone}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setStep(1)}
                    className='text-sm font-medium text-primary-700 hover:underline'>
                    Change
                  </button>
                </div>

                <div className='flex flex-col gap-3'>
                  <PaymentOption
                    icon={FiTruck}
                    title='Cash on delivery'
                    note='Pay when your order arrives'
                    checked={paymentMethod === 'cash_on_delivery'}
                    onSelect={() => setPaymentMethod('cash_on_delivery')}
                  />
                  <PaymentOption
                    icon={FiSmartphone}
                    title='M-Pesa'
                    note={mpesaAvailable ? 'Pay via STK push to your phone' : 'Not configured in this demo'}
                    checked={paymentMethod === 'mpesa'}
                    disabled={!mpesaAvailable}
                    onSelect={() => setPaymentMethod('mpesa')}
                  />
                  <PaymentOption
                    icon={FiCreditCard}
                    title='Card'
                    note={cardAvailable ? 'Visa, Mastercard' : 'Not configured in this demo'}
                    checked={paymentMethod === 'card'}
                    disabled={!cardAvailable}
                    onSelect={() => setPaymentMethod('card')}>
                    {cardAvailable && paymentMethod === 'card' && (
                      <div className='mt-3 flex flex-col gap-2'>
                        <div className='rounded-md border border-dark-300 bg-white px-3 py-2.5'>
                          <CardElement options={cardElementOptions} />
                        </div>
                        <p className='text-xs text-primary-700/70'>
                          This is Stripe test mode — no real charge happens. Use card number{' '}
                          <span className='font-mono font-semibold'>4242 4242 4242 4242</span>, any
                          future expiry date, and any 3-digit CVC.
                        </p>
                      </div>
                    )}
                  </PaymentOption>
                </div>

                {error && (
                  <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>
                    {error}
                  </p>
                )}

                <div className='mt-6 flex items-center justify-between gap-3'>
                  <button
                    type='button'
                    onClick={() => setStep(1)}
                    className='text-sm font-medium text-dark-600 hover:text-dark-900'>
                    Back
                  </button>
                  {/* The amount on the button: the last thing you read before
                      committing should be what you're committing to. */}
                  <button
                    type='button'
                    disabled={placing}
                    onClick={handlePlaceOrder}
                    className='rounded-md bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
                    {placing ? 'Placing order…' : `Place order · ${formatKsh(orderTotal)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className='lg:col-span-1'>
          <div className='rounded-lg border border-dark-200 bg-white p-5 lg:sticky lg:top-24'>
            <h2 className='font-heading text-lg font-bold text-dark-900'>Order summary</h2>

            {/* Thumbnails with a quantity badge, so the panel says what's in
                the order and not just what it costs. */}
            <ul className='mt-4 flex flex-wrap gap-2'>
              {items.map((item) => (
                <li key={item._id} className='relative'>
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    title={item.name}
                    className='h-12 w-12 rounded-md border border-dark-200 bg-dark-50 object-contain p-1'
                  />
                  <span className='absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-dark-800 px-1 text-[11px] font-semibold text-white'>
                    {item.qty}
                  </span>
                </li>
              ))}
            </ul>

            <div className='mt-4 space-y-2 border-t border-dark-100 pt-4 text-sm'>
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

              <div className='flex justify-between gap-3 text-dark-600'>
                <span>
                  Delivery
                  {shippingQuote && (
                    <span className='block text-xs text-dark-400'>{shippingQuote.method}</span>
                  )}
                </span>
                <span className='text-right tabular-nums'>
                  {!shippingQuote ? (
                    <span className='text-xs text-dark-400'>Enter your city</span>
                  ) : shippingQuote.free ? (
                    <span className='font-medium text-green-700'>Free</span>
                  ) : (
                    formatKsh(shippingQuote.amount)
                  )}
                </span>
              </div>
            </div>

            {/* "VAT included" rather than a tax row: Kenyan retail prices are
                quoted VAT-inclusive, so there's nothing to add on top, and
                `newOrder` saves `tax.amount: 0` accordingly. */}
            <div className='mt-4 flex items-baseline justify-between border-t border-dark-200 pt-4'>
              <span className='font-semibold text-dark-900'>Total</span>
              <span className='font-heading text-xl font-bold tabular-nums text-dark-900'>
                {formatKsh(orderTotal)}
              </span>
            </div>
            <p className='mt-1 text-right text-xs text-dark-500'>VAT included</p>

            <div className='mt-4 border-t border-dark-100 pt-4'>
              <PromoCodeBox />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
