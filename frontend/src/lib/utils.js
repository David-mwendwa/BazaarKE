import { twMerge } from 'tailwind-merge';

/**
 * Formats a number as Kenyan Shillings (Ksh)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string (e.g. 'Ksh 1,234')
 */
export const formatCurrency = (amount) => {
  const value = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `Ksh ${value.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

/**
 * Joins class names, flattening arrays and expanding `{ 'class': condition }`
 * objects — the shape the ported shadcn components pass — then resolves
 * Tailwind conflicts so the LAST argument wins.
 *
 * Both halves matter and both have already bitten this codebase:
 *
 *  - Flattening: the original one-liner (`classes.filter(Boolean).join(' ')`)
 *    stringified an array argument, so `['… justify-center', 'rounded-md …']`
 *    arrived as the invalid token `justify-center,rounded-md` and the classes
 *    either side of the comma were lost. That's why no `<Button>` was rounded.
 *    Objects became the literal `[object Object]`.
 *
 *  - Conflict resolution: without `twMerge`, a base class and a caller's
 *    override both survive into `class` and the winner is whichever Tailwind
 *    emits later in the stylesheet, not the one written last. Tailwind emits
 *    `p-0` before `p-6`, so `<CardContent className='p-0'>` — every dashboard
 *    table — kept `CardContent`'s base `p-6` and sat inset from its card.
 */
export const cn = (...classes) => {
  const out = [];

  const walk = (value) => {
    if (!value) return;

    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([key, enabled]) => enabled && out.push(key));
    }
  };

  classes.forEach(walk);
  return twMerge(out.join(' '));
};
