/**
 * Payment state in words that can't be mistaken for fulfilment state.
 *
 * Every screen that shows an order shows two states at once — how far along
 * it is, and whether the money arrived — and the two enums share vocabulary.
 * Printed raw, a cash-on-delivery order read "pending" twice for two
 * different reasons, and a cancelled order that had been paid read
 * "cancelled" beside a bare "paid" like a contradiction.
 *
 * None of these labels is a word in the order-status enum (`pending`,
 * `processing`, `shipped`, `delivered`, `cancelled`, `refunded`), so whichever
 * one you're reading, it's clear which question it answers.
 *
 * Lives in `lib/` rather than the dashboard's `tokens.js` because the customer's
 * own orders page needs it too, and the storefront shouldn't reach into the
 * dashboard's internals to get it.
 */
export const PAYMENT_LABELS = {
  paid: 'Paid',
  pending: 'Unpaid',
  failed: 'Payment failed',
  refunded: 'Money refunded',
  partially_refunded: 'Partly refunded',
  authorized: 'Authorised, not captured',
  processing: 'Payment in progress',
};

/** Falls back to the de-underscored enum, so a new status is readable, not blank. */
export const paymentLabel = (status) =>
  PAYMENT_LABELS[status] || (status ? status.replace(/_/g, ' ') : '');
