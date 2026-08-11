// Non-component shared values for the dashboard tables. Kept out of the
// *Cells.jsx modules so those stay component-only (and hot-reload cleanly).

export const FULFILMENT_STYLES = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // The Order schema's sixth status. It was missing here, so a refunded order
  // fell through to FulfilmentBadge's grey fallback — readable, but the only
  // status in the app whose colour was an accident.
  refunded: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

// Payment wording is shared with the customer's own orders page, so it lives
// in `lib/payment.js`; re-exported here so dashboard cells have one import.
export { PAYMENT_LABELS, paymentLabel } from '../../../lib/payment.js';

export const PAYMENT_STYLES = {
  paid: 'text-green-700 dark:text-green-400',
  pending: 'text-amber-700 dark:text-amber-400',
  failed: 'text-red-700 dark:text-red-400',
  refunded: 'text-gray-500 dark:text-gray-400',
  partially_refunded: 'text-gray-500 dark:text-gray-400',
};

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

/**
 * What a vendor may set. The API enforces the same list — cancelling and
 * refunding are the shop's decisions, not the seller's — so offering the full
 * set here would just produce a rejected request.
 */
export const VENDOR_ORDER_STATUSES = ['processing', 'shipped', 'delivered'];

/**
 * Where an order may go from where it is. Mirrors `TRANSITIONS` in
 * `backend/controllers/orderController.js`, which is the enforcing copy —
 * this one exists so the dropdown doesn't offer a move the API will reject.
 * Change them together.
 */
export const ORDER_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/**
 * What this role may set on an order in this state: the statuses the role is
 * trusted with, narrowed to the ones the lifecycle actually allows next.
 */
export const nextStatuses = (order, roleStatuses) =>
  (ORDER_TRANSITIONS[order.status] ?? []).filter((s) => roleStatuses.includes(s));

/**
 * What each status change actually does, for the confirmation dialog.
 *
 * The select is a one-click control sitting in a dense table — the wrong row
 * is an easy miss, and two of these have effects well outside the row. So the
 * message is per-status rather than a generic "are you sure": `cancelled` puts
 * stock back and frees the promo code (and the API refuses to walk it back),
 * `delivered` is what makes a review count as a verified purchase.
 *
 * Both order tables share this so an admin and a vendor are told the same
 * thing about the same action.
 */
const STATUS_CONSEQUENCES = {
  pending: 'The order goes back to waiting to be picked up.',
  processing: 'The order is being packed. The customer sees this on their orders page.',
  shipped: 'The customer sees it as on its way.',
  delivered:
    'This is the end of the line for the order, and it lets the customer leave a review marked as a verified purchase.',
  cancelled:
    'Every item goes back on sale, any promo code used is freed up, and the order cannot be reopened.',
  refunded: 'The order is closed as refunded. Moving money back is a separate job.',
};

/** Confirmation copy for `PATCH /orders/:id { status }`. */
export const statusChangeDialog = (order, status) => ({
  title: `Mark ${order.orderNumber} as ${status}?`,
  message: STATUS_CONSEQUENCES[status] || `The order moves to ${status}.`,
  confirmLabel: status === 'cancelled' ? 'Cancel the order' : `Mark ${status}`,
  // Only the two that can't be walked back get the red treatment; a routine
  // step forward asking in the same voice as a cancellation teaches an admin
  // to click through both without reading.
  tone: status === 'cancelled' || status === 'refunded' ? 'danger' : 'primary',
  cancelLabel: status === 'cancelled' ? 'Leave it open' : 'Cancel',
});

/** A vendor's display name, preferring their registered business name. */
export const vendorName = (vendor) =>
  !vendor
    ? '—'
    : vendor.vendorInfo?.businessName ||
      `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() ||
      vendor.email;

/**
 * Fills for the analytics status bar. Deliberately the same hues as
 * `FULFILMENT_STYLES` above — a status must not be amber in the order table
 * and grey in the chart of that same table.
 */
export const STATUS_FILLS = {
  pending: 'bg-amber-400',
  processing: 'bg-blue-500',
  shipped: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-400',
  refunded: 'bg-gray-400',
  unknown: 'bg-gray-300',
};

/** Shape the API's status breakdown into `StackedBar` segments. */
export const statusSegments = (breakdown) =>
  breakdown.map((row) => ({
    key: row.status,
    label: row.status,
    value: row.count,
    className: STATUS_FILLS[row.status] || STATUS_FILLS.unknown,
  }));

/** Reporting periods offered by both analytics screens. */
export const ANALYTICS_RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
  { id: 'all', label: 'All time' },
];
