import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCreditCard, FiTag, FiTruck } from 'react-icons/fi';
import { Gamepad2, Headphones, Laptop, Smartphone, Tablet } from 'lucide-react';

import apiClient from '../api/apiClient.js';
import ProductCard from '../components/ui/ProductCard.jsx';
import { useCategories } from '../hooks/useCategories.js';

/**
 * The storefront's landing page.
 *
 * Every claim on it is one the code can honour. The strip below the hero used
 * to promise a manufacturer warranty ("every listing shows its cover"), same
 * day tracked delivery, and M-Pesa or card at checkout. `warranty` is empty on
 * all 901 products, nothing in the app tracks a shipment, and checkout
 * completes on cash on delivery alone. The same three claims came off the
 * product page and the footer already; this was the last place they survived.
 *
 * What replaced them is read from the API, not typed here: the free-delivery
 * threshold and the zone rates come from `GET /shipping/rates`, the same table
 * `newOrder` charges from, so the promise and the invoice move together.
 */

const formatKsh = (n) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n || 0);

const CATEGORY_ICONS = {
  accessories: Headphones,
  computing: Laptop,
  gaming: Gamepad2,
  smartphones: Smartphone,
  tablets: Tablet,
};

/**
 * A rail's placeholder matches the card it stands in for — same image box
 * height, same two-line name, same button row — so nothing jumps when the
 * products land. The rails used to show the word "Loading…", which collapsed
 * the section to one line and then shoved the page down.
 */
const SkeletonCard = () => (
  <div className='flex h-full animate-pulse flex-col rounded-lg border border-dark-200 bg-white p-2 sm:p-3'>
    <div className='h-24 rounded-md bg-dark-100 sm:h-36 md:h-44' />
    <div className='mt-2 h-3 w-5/6 rounded-md bg-dark-100 sm:mt-3 sm:h-3.5' />
    <div className='mt-1.5 h-3 w-2/3 rounded-md bg-dark-100 sm:h-3.5' />
    <div className='mt-2 h-3.5 w-1/2 rounded-md bg-dark-100 sm:mt-3 sm:h-4' />
    <div className='mt-auto pt-2 sm:pt-4'>
      <div className='h-8 rounded-md bg-dark-100 sm:h-10' />
    </div>
  </div>
);

const ProductRail = ({ title, viewAllHref, products, loading, skeletonCount = 4 }) => (
  <section>
    <div className='mb-4 flex items-center justify-between'>
      <h2 className='font-heading text-base font-bold text-dark-900 sm:text-xl'>{title}</h2>
      <Link to={viewAllHref} className='text-sm font-semibold text-primary-700 hover:underline'>
        See all
      </Link>
    </div>
    {loading ? (
      <div className='grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4'>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    ) : products.length === 0 ? (
      <p className='text-sm text-dark-500'>Nothing here right now — check back soon.</p>
    ) : (
      <div className='grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4'>
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    )}
  </section>
);

/**
 * The categories, as a browse row. The header carries the same list, but a
 * shopper who lands on the home page shouldn't have to go looking in the nav
 * to find out what the shop sells — this is the first thing under the hero on
 * all three of the shops this storefront is modelled on.
 *
 * The list is whatever an admin has published (`GET /categories`), so the row
 * has to work at four entries or ten: the grid wraps, and each tile is the
 * same height whether or not the category has artwork.
 */
const CategoryRow = () => {
  const { categories } = useCategories();

  return (
    <section>
      <h2 className='mb-3 font-heading text-base font-bold text-dark-900 sm:mb-4 sm:text-xl'>
        Shop by category
      </h2>
      {/* One full-width row per category on mobile — a 2-column grid wraps an
          odd count (5 categories) into a ragged last row, and a lone tile
          reads like a mistake rather than a browse list. `sm:` and up have
          the width for the tile grid the shop's other shelves already use. */}
      <div className='flex flex-col divide-y divide-dark-100 overflow-hidden rounded-lg border border-dark-200 bg-white sm:grid sm:grid-cols-3 sm:gap-3 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-none sm:bg-transparent lg:grid-cols-5'>
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] || Laptop;

          return (
            <Link
              key={cat.slug}
              to={`/products?category=${cat.slug}`}
              className='flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary-50 sm:flex-col sm:gap-2.5 sm:rounded-lg sm:border sm:border-dark-200 sm:px-3 sm:py-5 sm:text-center sm:hover:border-primary-500'>
              {/* The category's photograph when an admin has set one, the icon
                  when they haven't. The artwork is optional in the real sense:
                  both fill the same circle, so a shop that has uploaded three
                  images out of six doesn't get a ragged row. */}
              <span className='flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-primary-700 sm:h-11 sm:w-11'>
                {cat.thumbnail ? (
                  <img
                    src={cat.thumbnail}
                    alt=''
                    loading='lazy'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <Icon className='h-4 w-4 sm:h-5 sm:w-5' />
                )}
              </span>
              <span className='text-sm font-semibold text-dark-800'>{cat.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

/**
 * Three facts, each one checkable against the code: the delivery table, the
 * coupon collection, and the single payment method that actually completes an
 * order. The delivery figures wait for the API rather than being hardcoded —
 * if the rate table changes, this changes with it.
 */
const TrustStrip = ({ rates }) => {
  const cheapest = rates?.zones?.length
    ? Math.min(...rates.zones.map((z) => z.amount))
    : null;

  const items = [
    {
      icon: FiTruck,
      title: rates ? `Free delivery over ${formatKsh(rates.freeAbove)}` : 'Free delivery on big orders',
      body: cheapest
        ? `Under that, delivery starts at ${formatKsh(cheapest)} — the exact rate for your town is shown at checkout.`
        : 'The exact rate for your town is shown at checkout, before you pay.',
    },
    {
      icon: FiTag,
      title: 'Promo codes',
      body: 'Any code we run publicly is listed in your cart — no hunting, no newsletter.',
    },
    {
      icon: FiCreditCard,
      title: 'Pay on delivery',
      body: 'Settle up in cash when your order reaches you.',
    },
  ];

  return (
    <section className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      {items.map(({ icon: Icon, title, body }) => (
        <div
          key={title}
          className='flex items-start gap-3 rounded-lg border border-dark-200 bg-white p-4'>
          <Icon className='mt-0.5 shrink-0 text-primary-700' size={22} />
          <div>
            <p className='text-sm font-semibold text-dark-900'>{title}</p>
            <p className='mt-0.5 text-xs leading-relaxed text-dark-500'>{body}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

const Home = () => {
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [smartphones, setSmartphones] = useState([]);
  const [smartphonesLoading, setSmartphonesLoading] = useState(true);
  const [gaming, setGaming] = useState([]);
  const [gamingLoading, setGamingLoading] = useState(true);
  const [newest, setNewest] = useState([]);
  const [newestLoading, setNewestLoading] = useState(true);
  const [rates, setRates] = useState(null);

  useEffect(() => {
    apiClient
      .get('/products', { params: { onSale: 'true', limit: 8, sort: '-createdAt' } })
      .then((res) => setDeals(res.data.products || []))
      .catch(() => setDeals([]))
      .finally(() => setDealsLoading(false));

    apiClient
      .get('/products', { params: { categories: 'smartphones', limit: 4, sort: '-createdAt' } })
      .then((res) => setSmartphones(res.data.products || []))
      .catch(() => setSmartphones([]))
      .finally(() => setSmartphonesLoading(false));

    apiClient
      .get('/products', { params: { categories: 'gaming', limit: 4, sort: '-createdAt' } })
      .then((res) => setGaming(res.data.products || []))
      .catch(() => setGaming([]))
      .finally(() => setGamingLoading(false));

    apiClient
      .get('/products', { params: { limit: 8, sort: '-createdAt' } })
      .then((res) => setNewest(res.data.products || []))
      .catch(() => setNewest([]))
      .finally(() => setNewestLoading(false));

    apiClient
      .get('/shipping/rates')
      .then((res) => setRates(res.data))
      .catch(() => setRates(null));
  }, []);

  return (
    <div className='flex flex-col gap-12 pb-16'>
      <section className='flex flex-col items-start gap-4 rounded-lg bg-gradient-to-br from-primary-700 to-primary-900 px-8 py-14 text-white'>
        <span className='text-sm font-semibold uppercase tracking-wide text-secondary-400'>
          Kenya&apos;s marketplace
        </span>
        {/* Says what the platform is, not how fast it ships. The line here used
            to promise "delivered fast", which nothing behind it can keep —
            there is no SLA, only zoned rates quoted in the cart — and it sold
            the catalogue as electronics, which is no longer the intent. */}
        <h1 className='max-w-xl font-heading text-3xl font-bold md:text-4xl'>
          Many sellers, one cart. Shop vendors across Kenya.
        </h1>
        {/* Two doors, not one. "Shop all" is the catalogue; a shopper who came
            for a bargain shouldn't have to browse 901 products to find the
            discounted ones. */}
        <div className='mt-2 flex flex-wrap gap-3'>
          <Link
            to='/products'
            className='inline-block rounded-md bg-secondary-500 px-6 py-3 font-semibold text-dark-900 transition-colors hover:bg-secondary-600'>
            Shop all products
          </Link>
          <Link
            to='/products?onSale=true'
            className='inline-block rounded-md border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10'>
            See today's deals
          </Link>
        </div>
      </section>

      <CategoryRow />

      <TrustStrip rates={rates} />

      {(dealsLoading || deals.length > 0) && (
        <ProductRail
          title='Deals right now'
          viewAllHref='/products?onSale=true'
          products={deals}
          loading={dealsLoading}
          skeletonCount={8}
        />
      )}

      {/* "New in", not "Popular in" — these rails are sorted by `-createdAt`.
          Nothing in the catalogue records views or sales, so a popularity
          claim would be decoration over an arbitrary order. */}
      <ProductRail
        title='New in Smartphones'
        viewAllHref='/products?category=smartphones'
        products={smartphones}
        loading={smartphonesLoading}
      />

      <ProductRail
        title='New in Gaming'
        viewAllHref='/products?category=gaming'
        products={gaming}
        loading={gamingLoading}
      />

      <ProductRail
        title='Newest arrivals'
        viewAllHref='/products'
        products={newest}
        loading={newestLoading}
        skeletonCount={8}
      />
    </div>
  );
};

export default Home;
