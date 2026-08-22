import { FiStar } from 'react-icons/fi';

/**
 * Stars, in the two jobs a shop needs them for.
 *
 * `StarRating` is read-only and takes a fractional average — 4.3 draws four
 * filled stars and a partial fifth, clipped with a nested overflow rather
 * than rounded, because rounding 4.5 up to five stars overstates the product.
 *
 * `StarInput` is the editable one on the review form.
 *
 * Both are `FiStar`, the icon set the storefront already uses, in the
 * secondary (amber) accent — the tone reserved for prices, savings and deals,
 * which is the same family of "reason to buy" signal.
 */

const SIZES = { xs: 10, sm: 12, md: 15, lg: 18 };

export const StarRating = ({ value = 0, count, size = 'md', className = '' }) => {
  const px = SIZES[size] || SIZES.md;
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  const percent = (clamped / 5) * 100;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Two stacked rows, the filled one clipped to the score's width. A
          per-star fill fraction would be five separate clip calculations for
          the same result. */}
      <span
        className='relative inline-flex shrink-0'
        role='img'
        aria-label={`Rated ${clamped.toFixed(1)} out of 5`}>
        <span className='flex text-dark-300'>
          {[0, 1, 2, 3, 4].map((i) => (
            <FiStar key={i} size={px} aria-hidden='true' />
          ))}
        </span>
        <span
          className='absolute inset-0 flex overflow-hidden text-secondary-500'
          style={{ width: `${percent}%` }}
          aria-hidden='true'>
          {[0, 1, 2, 3, 4].map((i) => (
            <FiStar key={i} size={px} fill='currentColor' className='shrink-0' />
          ))}
        </span>
      </span>
      {typeof count === 'number' && (
        <span className='text-[9px] tabular-nums text-dark-500 sm:text-xs'>({count})</span>
      )}
    </span>
  );
};

export const StarInput = ({ value, onChange, name = 'rating' }) => (
  // A radio group, not five buttons: arrow keys move between stars, the
  // selection is announced, and it submits with the form for free.
  <div className='flex items-center gap-1' role='radiogroup' aria-label='Your rating'>
    {[1, 2, 3, 4, 5].map((star) => (
      <label
        key={star}
        className='cursor-pointer p-0.5 text-dark-300 transition-colors focus-within:ring-2 focus-within:ring-primary-500 has-[:checked]:text-secondary-500'>
        <input
          type='radio'
          name={name}
          value={star}
          checked={value === star}
          onChange={() => onChange(star)}
          className='sr-only'
        />
        <FiStar
          size={26}
          fill={star <= value ? 'currentColor' : 'none'}
          className={star <= value ? 'text-secondary-500' : 'text-dark-300 hover:text-secondary-400'}
        />
        <span className='sr-only'>
          {star} star{star === 1 ? '' : 's'}
        </span>
      </label>
    ))}
  </div>
);

export default StarRating;
