import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

/**
 * The stall mark: a market awning with three bays and the counter beneath it.
 *
 * Drawn here rather than pulled from react-icons because no icon set carries a
 * market stall, and the alternatives all say the wrong thing — a shopping bag
 * or trolley is any shop at all, and the `FiZap` bolt this replaced was an
 * electricity metaphor inherited from the project's previous name, describing a
 * catalogue this is no longer meant to be limited to.
 *
 * The three bays are the load-bearing part: a bazaar is many sellers under one
 * roof, which is exactly what separates this from a single-vendor store. Three
 * is the smallest number that reads as "several" rather than "a pair", and it
 * still holds its shape at the 20px the dashboard sidebar renders it at.
 *
 * The canopy is fixed amber on both grounds — it's the one spot of brand colour
 * and it carries on light and dark alike. The frame takes `currentColor` so it
 * inherits whatever the wordmark is using, which is what lets the footer drop
 * the whole mark onto a near-black bar without a second colour rule.
 */
export const StallMark = ({ size = 22, className }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    className={className}
    aria-hidden='true'
    focusable='false'>
    <path
      d='M2.5 5H21.5V10Q18.33 13.9 15.17 10Q12 13.9 8.83 10Q5.67 13.9 2.5 10Z'
      className='fill-secondary-500'
    />
    <path
      d='M5.75 12.5V19M18.25 12.5V19M3.5 19H20.5'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinecap='round'
    />
  </svg>
);

/**
 * The BazaarKE wordmark, in one place so the storefront header and the
 * dashboard sidebar can't drift apart. The dashboard used to head its sidebar
 * with "<Role> Dashboard", which read as a different product from the store
 * the vendor had just come from.
 *
 * The split is Bazaar + KE because the country code is the half that says which
 * marketplace this is, so it takes the accent colour and the mark sits beside
 * it. Dark variants are on the text only — the canopy keeps its amber on both
 * grounds.
 */
const BrandLogo = ({ to = '/', className, iconSize = 22 }) => (
  <Link
    to={to}
    className={cn(
      'flex shrink-0 items-center gap-1.5 font-heading text-2xl font-bold text-primary-700 dark:text-primary-400',
      className
    )}>
    <StallMark size={iconSize} />
    <span>
      Bazaar<span className='text-secondary-600 dark:text-secondary-400'>KE</span>
    </span>
  </Link>
);

export default BrandLogo;
