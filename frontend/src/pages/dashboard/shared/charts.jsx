import { useId, useMemo, useState } from 'react';

import { cn, formatCurrency } from '../../../lib/utils';

/**
 * Charts, hand-drawn in SVG.
 *
 * No chart library: the three shapes below are all the dashboards need, and
 * Recharts alone is ~100KB into a bundle that is already carefully split so
 * shoppers never download the dashboard. Rolling three small components also
 * means they inherit the app's tokens directly rather than being themed
 * through a library's own API.
 *
 * All three are keyboard- and screen-reader-reachable: each carries a text
 * summary that reads the underlying figures, because an SVG of a line is
 * nothing at all to a screen reader.
 */

/** Compact axis labels — 1.2M rather than 1,200,000, which won't fit. */
const compactKsh = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
};

const labelFor = (date, granularity) =>
  granularity === 'month'
    ? new Date(`${date}-01`).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' })
    : new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

/**
 * Revenue over time.
 *
 * An area under a line rather than bars: the buckets are a continuous series
 * (every day in the range is present, zero-filled by the API), and bars invite
 * comparison between adjacent days when the shape of the run is the point.
 *
 * The hover readout is a pointer overlay rather than a per-point `<circle>`
 * with its own handler — at 365 daily buckets that would be 365 elements
 * listening, and the hit targets would be two pixels wide.
 */
export const TrendChart = ({ series, granularity, metric = 'revenue', height = 200 }) => {
  const gradientId = useId();
  const [hover, setHover] = useState(null);

  const values = series.map((point) => point[metric] || 0);
  const max = Math.max(...values, 1);
  const width = 1000;
  const pad = { top: 8, bottom: 4 };
  const plot = height - pad.top - pad.bottom;

  const x = (index) => (series.length === 1 ? width / 2 : (index / (series.length - 1)) * width);
  const y = (value) => pad.top + plot - (value / max) * plot;

  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(value)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${height} L${x(0)},${height} Z`;

  const total = values.reduce((sum, value) => sum + value, 0);
  const peakIndex = values.indexOf(Math.max(...values));

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    const index = Math.round(ratio * (series.length - 1));
    if (index >= 0 && index < series.length) setHover(index);
  };

  const active = hover === null ? null : series[hover];

  return (
    <div className='relative'>
      <div
        className='relative'
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role='img'
        aria-label={
          metric === 'revenue'
            ? `Revenue by ${granularity}. Total ${formatCurrency(total)} across ${series.length} ${granularity}s, peaking at ${formatCurrency(values[peakIndex])} on ${series[peakIndex]?.date}.`
            : `Orders by ${granularity}. ${total} in total across ${series.length} ${granularity}s.`
        }>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio='none'
          className='w-full'
          style={{ height }}
          aria-hidden='true'>
          <defs>
            <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='currentColor' stopOpacity='0.22' />
              <stop offset='100%' stopColor='currentColor' stopOpacity='0' />
            </linearGradient>
          </defs>

          {/* Three quiet gridlines. Enough to read a height off; more would
              compete with the line itself. */}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1='0'
              x2={width}
              y1={pad.top + plot * fraction}
              y2={pad.top + plot * fraction}
              className='stroke-gray-200 dark:stroke-gray-700'
              strokeWidth='1'
              vectorEffect='non-scaling-stroke'
            />
          ))}

          <g className='text-primary-600 dark:text-primary-400'>
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinejoin='round'
              strokeLinecap='round'
              vectorEffect='non-scaling-stroke'
            />
            {/* The last point, marked — "where it ended up" is the question a
                trend line is usually being asked. */}
            <circle
              cx={x(values.length - 1)}
              cy={y(values[values.length - 1])}
              r='3.5'
              fill='currentColor'
              vectorEffect='non-scaling-stroke'
            />
            {hover !== null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={height}
                stroke='currentColor'
                strokeWidth='1'
                strokeDasharray='3 3'
                vectorEffect='non-scaling-stroke'
              />
            )}
          </g>
        </svg>

        {active && (
          <div className='pointer-events-none absolute left-0 top-0 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-700'>
            <span className='font-semibold tabular-nums'>
              {metric === 'revenue' ? formatCurrency(active.revenue) : active.orders}
            </span>
            <span className='ml-1.5 opacity-70'>{labelFor(active.date, granularity)}</span>
          </div>
        )}
      </div>

      <div className='mt-1 flex justify-between text-xs text-muted-foreground'>
        <span>{series.length ? labelFor(series[0].date, granularity) : ''}</span>
        <span className='tabular-nums'>peak {compactKsh(values[peakIndex])}</span>
        <span>{series.length ? labelFor(series[series.length - 1].date, granularity) : ''}</span>
      </div>
    </div>
  );
};

/**
 * A ranked list with a bar behind each row.
 *
 * The right shape for "top products" and "top categories": the label is the
 * thing being read, and the bar is a comparison cue behind it. A pie of eight
 * product names would be unreadable at any size that fits in a card.
 */
export const BarList = ({ items, valueKey = 'revenue', format = formatCurrency, emptyLabel }) => {
  const max = useMemo(
    () => Math.max(...items.map((item) => item[valueKey] || 0), 1),
    [items, valueKey],
  );

  if (!items.length) {
    return <p className='py-8 text-center text-sm text-muted-foreground'>{emptyLabel}</p>;
  }

  return (
    <ol className='space-y-2.5'>
      {items.map((item) => (
        <li key={item.key} className='relative'>
          <div
            className='absolute inset-y-0 left-0 rounded-md bg-primary-50 dark:bg-primary-900/25'
            style={{ width: `${((item[valueKey] || 0) / max) * 100}%` }}
            aria-hidden='true'
          />
          <div className='relative flex items-center justify-between gap-3 px-2 py-1.5'>
            <span className='min-w-0 truncate text-sm text-foreground' title={item.label}>
              {item.label}
            </span>
            <span className='shrink-0 text-sm font-medium tabular-nums text-foreground'>
              {format(item[valueKey])}
              {item.units !== undefined && (
                <span className='ml-2 text-xs font-normal text-muted-foreground'>
                  {item.units} sold
                </span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
};

/**
 * A one-row stacked bar with a legend under it.
 *
 * For the order-status split. A donut would need a legend anyway to name six
 * statuses, and this reads as what it is: a hundred percent of the orders,
 * divided up.
 */
export const StackedBar = ({ segments, total, emptyLabel }) => {
  if (!total) {
    return <p className='py-8 text-center text-sm text-muted-foreground'>{emptyLabel}</p>;
  }

  return (
    <div>
      <div className='flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800'>
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>

      <ul className='mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2'>
        {segments.map((segment) => (
          <li key={segment.key} className='flex items-center justify-between gap-2 text-sm'>
            <span className='flex min-w-0 items-center gap-2'>
              <span
                className={cn('h-2.5 w-2.5 shrink-0 rounded-full', segment.className)}
                aria-hidden='true'
              />
              <span className='truncate capitalize text-muted-foreground'>{segment.label}</span>
            </span>
            <span className='shrink-0 font-medium tabular-nums text-foreground'>
              {segment.value}
              <span className='ml-1.5 text-xs font-normal text-muted-foreground'>
                {Math.round((segment.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
