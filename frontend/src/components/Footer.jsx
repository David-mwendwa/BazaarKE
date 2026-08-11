import { Link } from 'react-router-dom';
import { FiExternalLink, FiMail } from 'react-icons/fi';
import { StallMark } from './common/BrandLogo.jsx';

/**
 * A deliberately small footer: the wordmark and a contact address on one
 * side, a single row of links on the other, then the copyright and the
 * developer credit — MarketHub's bottom bar, which is the part of its footer
 * worth keeping.
 *
 * It used to run four columns, two of which were claims nothing backs:
 * "Why shop with us" (manufacturer warranty, hassle-free returns, tracked
 * delivery) and "Payments accepted" (M-Pesa, Visa/Mastercard, PayPal).
 * `warranty` and `returnsPolicy` are empty on all 901 products, nothing in the
 * app tracks a shipment, and Checkout completes on cash on delivery alone.
 * The same strip came off the product page and the home page for the same
 * reason. (Delivery itself is real now — zoned rates with a free-delivery
 * threshold — but it's quoted in the cart and at checkout, where it's
 * actionable, not asserted down here.)
 *
 * The category list went too — not because it was untrue, but because the
 * header carries every category already, and a footer that repeats the nav
 * is just a taller page.
 */

const LINKS = [
  { to: '/products', label: 'All products' },
  { to: '/products?onSale=true', label: 'Deals' },
  { to: '/products?sort=-createdAt', label: 'New arrivals' },
  { to: '/cart', label: 'Cart' },
  { to: '/account/orders', label: 'Orders' },
];

const Footer = () => (
  <footer className='mt-16 bg-dark-900 text-dark-300'>
    <div className='max-w-page mx-auto flex flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8'>
      <div>
        {/* The mark takes its frame from `currentColor`, so the white heading
            here is the only colour rule this dark bar needs; the canopy stays
            amber on its own. The accent shade is 500 rather than the header's
            600 because this ground is near-black. */}
        <h3 className='flex items-center gap-1.5 font-heading text-lg font-bold text-white'>
          <StallMark size={20} />
          <span>
            Bazaar<span className='text-secondary-500'>KE</span>
          </span>
        </h3>
        <p className='mt-1 max-w-xs text-sm text-dark-400'>
          Kenya&apos;s multi-vendor marketplace — many sellers, one cart, one checkout.
        </p>
        <a
          href='mailto:support@bazaarke.dev'
          className='mt-1.5 inline-flex items-center gap-2 text-sm text-dark-400 transition-colors hover:text-white'>
          <FiMail size={14} />
          support@bazaarke.dev
        </a>
      </div>

      <nav className='flex flex-wrap gap-x-6 gap-y-2'>
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className='text-sm text-dark-400 transition-colors hover:text-white'>
            {link.label}
          </Link>
        ))}
      </nav>
    </div>

    <div className='border-t border-dark-800'>
      <div className='max-w-page mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-dark-500 sm:flex-row sm:px-6 lg:px-8'>
        <p>© {new Date().getFullYear()} BazaarKE. All rights reserved.</p>
        <p className='flex items-center gap-1'>
          Developed by
          <a
            href='https://techdave.netlify.app/'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 font-semibold text-secondary-500 transition-colors hover:text-secondary-400'>
            David
            <FiExternalLink size={12} aria-hidden='true' />
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
