import { cloneElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A hover/focus label for icon-only controls. Ported from InkEngine.
 *
 * Replaces the native `title` attribute, which takes about a second to appear,
 * can't be styled or made legible in dark mode, and never shows for keyboard
 * users at all.
 *
 * Positioned with fixed coordinates in a portal rather than absolutely inside
 * the trigger: the dashboard tables are `overflow-x-auto`, which would clip a
 * tooltip anchored within them — the top row's would be cut in half.
 *
 * The label doubles as the trigger's `aria-label` when it doesn't already have
 * one, so an icon button is never left unnamed.
 */

const SHOW_DELAY_MS = 350;
const GAP = 8;
// Roughly half a short label — keeps the bubble from hanging off either edge.
const EDGE_MARGIN = 70;

const Tooltip = ({ label, children }) => {
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const timerRef = useRef(null);
  const id = useId();

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setCoords(null);
  }, []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Flip below when there isn't room above — the top row of a table sits
    // right under the sticky header.
    const above = rect.top > 64;
    setCoords({
      x: Math.min(
        Math.max(rect.left + rect.width / 2, EDGE_MARGIN),
        window.innerWidth - EDGE_MARGIN,
      ),
      y: above ? rect.top - GAP : rect.bottom + GAP,
      above,
    });
  }, []);

  // Pointer hover waits, so sweeping the cursor across a row of icons doesn't
  // flash four tooltips. Keyboard focus is deliberate — show it immediately.
  const showDelayed = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(place, SHOW_DELAY_MS);
  }, [place]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!coords) return undefined;
    // The coordinates are frozen at fixed positions, so anything that moves
    // the trigger would strand the bubble. Dismiss instead of chasing it.
    const onScroll = () => hide();
    const onKeyDown = (e) => e.key === 'Escape' && hide();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [coords, hide]);

  const trigger = cloneElement(children, {
    ref: triggerRef,
    'aria-label': children.props['aria-label'] ?? label,
    'aria-describedby': coords ? id : undefined,
    onMouseEnter: (e) => {
      children.props.onMouseEnter?.(e);
      showDelayed();
    },
    onMouseLeave: (e) => {
      children.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e) => {
      children.props.onFocus?.(e);
      place();
    },
    onBlur: (e) => {
      children.props.onBlur?.(e);
      hide();
    },
    // A tap shouldn't leave a tooltip hanging over the thing it just fired.
    onClick: (e) => {
      children.props.onClick?.(e);
      hide();
    },
  });

  return (
    <>
      {trigger}
      {coords &&
        createPortal(
          <div
            id={id}
            role='tooltip'
            style={{ left: coords.x, top: coords.y }}
            // Inverted against the page in both themes — a dark bubble on the
            // dark surface reads as another panel rather than an overlay.
            className={`pointer-events-none fixed z-50 -translate-x-1/2 animate-fade-in whitespace-nowrap rounded-md bg-dark-800 px-2 py-1 text-xs font-medium text-dark-50 shadow-card dark:bg-dark-100 dark:text-dark-900 ${
              coords.above ? '-translate-y-full' : ''
            }`}>
            {label}
          </div>,
          document.body,
        )}
    </>
  );
};

export default Tooltip;
