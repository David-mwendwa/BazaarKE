import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { Card, CardContent } from '../../../components/ui/Card';
import { cn } from '../../../lib/utils';
import { ANALYTICS_RANGES } from './tokens.js';

/**
 * The pieces both analytics screens are built from.
 *
 * The two pages ask different questions — an admin wants the platform, a
 * vendor wants their own shelf — but the furniture is the same, and this is
 * where it lives so the two can't drift into different-looking dashboards.
 */

export const RangePicker = ({ value, onChange }) => (
  <div
    className='flex rounded-md border border-input p-0.5'
    role='group'
    aria-label='Reporting period'>
    {ANALYTICS_RANGES.map((range) => (
      <button
        key={range.id}
        type='button'
        onClick={() => onChange(range.id)}
        aria-pressed={value === range.id}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          value === range.id
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
            : 'text-muted-foreground hover:text-foreground',
        )}>
        {range.label}
      </button>
    ))}
  </div>
);

/**
 * Period-on-period movement.
 *
 * `null` renders nothing at all rather than a dash or a zero. The API returns
 * null when there is genuinely nothing to compare against — an all-time range
 * has no preceding period, and a previous period of zero makes any percentage
 * meaningless — and inventing "+100%" there would be the exact kind of number
 * that looks like data and isn't.
 */
export const DeltaChip = ({ change, invert = false }) => {
  if (change === null || change === undefined) return null;

  const flat = Math.abs(change) < 0.05;
  const good = invert ? change < 0 : change > 0;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
        flat
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          : good
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      )}>
      <Icon className='h-3 w-3' aria-hidden='true' />
      {flat ? 'flat' : `${Math.abs(change)}%`}
      <span className='sr-only'> compared with the previous period</span>
    </span>
  );
};

/** A headline figure, its label, and how it moved. */
export const MetricTile = ({ label, value, change, invert, hint }) => (
  <Card>
    <CardContent className='p-5'>
      <p className='text-sm font-medium text-muted-foreground'>{label}</p>
      <div className='mt-1 flex flex-wrap items-baseline gap-2'>
        <p className='text-2xl font-semibold tabular-nums text-foreground'>{value}</p>
        <DeltaChip change={change} invert={invert} />
      </div>
      {hint && <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>}
    </CardContent>
  </Card>
);

/** A titled panel. Optional `aside` for a right-aligned note or control. */
export const Panel = ({ title, aside, children, className }) => (
  <Card className={className}>
    <CardContent className='p-5'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='font-semibold text-foreground'>{title}</h2>
        {aside}
      </div>
      {children}
    </CardContent>
  </Card>
);

/**
 * The line every analytics page carries.
 *
 * Charts invite the reader to assume the numbers mean more than they do, and
 * "revenue" here has a specific definition that isn't obvious. Saying it once,
 * plainly, under the figures is cheaper than an admin reconciling against a
 * bank statement and finding a gap nobody documented.
 */
export const MethodologyNote = ({ children }) => (
  <p className='text-xs leading-relaxed text-muted-foreground'>{children}</p>
);
