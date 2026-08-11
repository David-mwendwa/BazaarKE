import { Link } from 'react-router-dom';

import Tooltip from '../../../components/ui/Tooltip';
import { cn } from '../../../lib/utils';

/**
 * The actions at the end of a dashboard table row.
 *
 * These were a `…` menu on every table. A menu is the right call when there
 * are more actions than fit, or when they need describing — but every one of
 * these rows has two to four actions with an obvious icon each, and the
 * Actions column has the width to show them. A menu there costs a click and a
 * pointer trip to reach something that could have been hit directly.
 *
 * Each icon carries a `Tooltip`, which is doing two jobs: naming the action
 * for a mouse user, and naming it for a screen reader (the tooltip applies its
 * label as `aria-label`). An icon button without one is an unlabelled control.
 *
 * Tone is what separates a destructive action from the rest — it stays
 * muted until hover, so a row of icons doesn't read as a row of warnings.
 */

const TONES = {
  default: 'hover:text-foreground hover:bg-muted',
  primary: 'hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30',
  danger: 'hover:text-destructive hover:bg-destructive/10',
};

const base =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40';

/**
 * One icon action. Renders a `Link` when given `to`, a `button` otherwise —
 * navigation should be a real link, so it opens in a new tab on middle-click
 * the way an admin expects.
 */
export const IconAction = ({
  icon: Icon,
  label,
  onClick,
  to,
  tone = 'default',
  disabled = false,
  className,
}) => {
  const classes = cn(base, TONES[tone] || TONES.default, className);
  const glyph = <Icon className='h-4 w-4' aria-hidden='true' />;

  // A disabled action still occupies its slot rather than disappearing, so the
  // icons don't shuffle position between rows and get mis-clicked.
  if (disabled) {
    return (
      <span className={cn(classes, 'pointer-events-none opacity-40')} aria-hidden='true'>
        {glyph}
      </span>
    );
  }

  return (
    <Tooltip label={label}>
      {to ? (
        <Link to={to} className={classes} onClick={(e) => e.stopPropagation()}>
          {glyph}
        </Link>
      ) : (
        <button
          type='button'
          className={classes}
          onClick={(e) => {
            // Several of these tables make the whole row clickable.
            e.stopPropagation();
            onClick?.(e);
          }}>
          {glyph}
        </button>
      )}
    </Tooltip>
  );
};

/** The row of them. `justify-end` because the Actions column is right-aligned. */
export const RowActions = ({ children, className }) => (
  <div className={cn('flex items-center justify-end gap-0.5', className)}>{children}</div>
);

export default RowActions;
