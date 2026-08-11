import { StatusCodes } from 'http-status-codes';

import Order from '../models/Order.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthenticatedError,
} from '../errors/customErrors.js';
import { sendTemplate } from '../utils/mailer.js';
import { paymentConfirmed, paymentRejected } from '../utils/emailTemplates.js';

/**
 * ## Confirming that money actually arrived
 *
 * Every automated payment path in this app can report success without a
 * shilling having moved. The M-Pesa integration runs against Safaricom's
 * sandbox with `MPESA_SIMULATE_CALLBACK=true`, because that sandbox app has no
 * test MSISDN that can approve an STK push — so the callback that flips an
 * order to `paid` is one the server fires at itself. Cash on delivery is money
 * handed to a rider with nothing watching. A bank transfer is only ever
 * confirmed by a person reading a statement.
 *
 * So there is a human step, and this is it. Two halves:
 *
 *  - the payer submits a claim (`submitPaymentReference`) — an M-Pesa code, a
 *    bank reference. A claim is not a payment, which is why it writes
 *    `payment.verification.state`, never `payment.status`.
 *  - an admin reviews it (`reviewPayment`) and that decision is what moves
 *    `payment.status`. An admin can also confirm a payment nobody claimed,
 *    which is the normal case for cash collected on delivery.
 *
 * The queue is orders in either of those states, plus anything that took money
 * through a gateway and has never been checked by a person.
 */

const CHANNELS = ['mpesa', 'bank_transfer', 'cash', 'card', 'paypal', 'other'];

/** Payment states where asking for the money again makes no sense. */
const SETTLED = ['refunded', 'partially_refunded'];

const money = (order) => order?.total?.amount || 0;

/**
 * The shape both dashboard tables read. Deliberately narrow: this list is a
 * queue of decisions, not an order browser, so it carries what's needed to
 * decide and links out for the rest.
 */
const toReviewRow = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  createdAt: order.createdAt,
  status: order.status,
  total: money(order),
  currency: order.total?.currency || 'KES',
  itemCount: order.items?.reduce((n, item) => n + (item.quantity || 0), 0) || 0,
  customer: {
    name:
      order.customer?.name ||
      [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') ||
      '—',
    email: order.customer?.email || order.user?.email || null,
    phone: order.customer?.phone || null,
  },
  payment: {
    method: order.payment?.method,
    status: order.payment?.status,
    provider: order.payment?.provider,
    transactionId: order.payment?.transactionId,
    mpesaReceipt: order.payment?.mpesa?.receiptNumber,
    verification: order.payment?.verification || { state: 'none' },
  },
});

/**
 * POST /api/v1/orders/:id/payment/reference — the payer's claim.
 *
 * Owner only. A vendor or admin submitting on someone's behalf would be
 * recording a claim under the customer's name, which is exactly the thing the
 * reviewer is supposed to be able to trust.
 */
export const submitPaymentReference = async (req, res) => {
  const { reference, channel, payerNote } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new NotFoundError(`No order found with ID: ${req.params.id}`);

  const userId = req.user.id || req.user._id?.toString();
  if (order.user?.toString() !== userId) {
    throw new UnauthenticatedError('Not authorized to update this order');
  }

  if (order.payment?.status === 'paid') {
    throw new BadRequestError('This order is already paid — nothing to send us.');
  }
  if (SETTLED.includes(order.payment?.status)) {
    throw new BadRequestError('This order has been refunded.');
  }
  if (order.status === 'cancelled') {
    throw new BadRequestError('This order was cancelled.');
  }

  const trimmed = String(reference || '').trim();
  if (!trimmed) {
    throw new BadRequestError('Enter the transaction code from your payment confirmation.');
  }
  if (trimmed.length > 64) {
    throw new BadRequestError('That reference is too long — check and re-enter it.');
  }
  if (channel && !CHANNELS.includes(channel)) {
    throw new BadRequestError('Choose how you paid.');
  }

  order.payment.verification = {
    ...(order.payment.verification?.toObject?.() || order.payment.verification || {}),
    state: 'submitted',
    reference: trimmed,
    channel: channel || order.payment.method || 'other',
    payerNote: String(payerNote || '').trim() || undefined,
    submittedAt: new Date(),
    submittedBy: userId,
    // A resubmission after a rejection starts a fresh review — carrying the
    // old decision forward would show the customer "rejected" next to the
    // reference they just sent to replace it.
    reviewedAt: undefined,
    reviewedBy: undefined,
    reviewNote: undefined,
  };

  await order.save({ validateModifiedOnly: true });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Thanks — we'll confirm this against our records shortly.",
    verification: order.payment.verification,
  });
};

/**
 * GET /api/v1/admin/payments — the review queue.
 *
 * `state` filters what needs doing:
 *   awaiting  — a customer claim nobody has looked at, plus anything a
 *               gateway marked paid that no person has confirmed
 *   submitted — customer claims only
 *   unpaid    — placed, not cancelled, no money recorded
 *   confirmed / rejected — the history of decisions
 */
export const listPaymentsForReview = async (req, res) => {
  const { state = 'awaiting', search = '', page = 1, limit = 20 } = req.query;

  const filters = {
    awaiting: {
      status: { $ne: 'cancelled' },
      $or: [
        { 'payment.verification.state': 'submitted' },
        {
          'payment.status': 'paid',
          'payment.verification.state': { $in: [null, 'none'] },
        },
      ],
    },
    submitted: { 'payment.verification.state': 'submitted' },
    unpaid: {
      status: { $ne: 'cancelled' },
      'payment.status': { $in: ['pending', 'processing', 'authorized', 'failed'] },
    },
    confirmed: { 'payment.verification.state': 'confirmed' },
    rejected: { 'payment.verification.state': 'rejected' },
    all: {},
  };

  const stateFilter = filters[state] ?? filters.awaiting;

  // `$and`, never a spread merge: the `awaiting` filter already owns a top
  // level `$or`, and a second one would silently replace it — widening the
  // queue to every order matching the text, in any payment state.
  const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = safe
    ? {
        $and: [
          stateFilter,
          {
            $or: [
              { orderNumber: new RegExp(safe, 'i') },
              { 'customer.email': new RegExp(safe, 'i') },
              { 'customer.name': new RegExp(safe, 'i') },
              { 'payment.verification.reference': new RegExp(safe, 'i') },
              { 'payment.transactionId': new RegExp(safe, 'i') },
              { 'payment.mpesa.receiptNumber': new RegExp(safe, 'i') },
            ],
          },
        ],
      }
    : stateFilter;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [orders, total, counts] = await Promise.all([
    Order.find(query)
      .sort({ 'payment.verification.submittedAt': -1, createdAt: -1, _id: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('user', 'firstName lastName email')
      .lean(),
    Order.countDocuments(query),
    Promise.all([
      Order.countDocuments(filters.submitted),
      Order.countDocuments(filters.unpaid),
    ]),
  ]);

  res.status(StatusCodes.OK).json({
    success: true,
    orders: orders.map(toReviewRow),
    pagination: { page: pageNum, limit: perPage, total, pages: Math.ceil(total / perPage) },
    // Badge counts for the sidebar/tabs. Cheap enough to send every time and
    // it keeps the tab labels from lying after a decision.
    counts: { submitted: counts[0], unpaid: counts[1] },
  });
};

/**
 * PATCH /api/v1/orders/:id/payment/review — admin decision.
 *
 * Confirming is the only thing in the app that sets `payment.status: 'paid'`
 * by hand, and it records who did it. Rejecting does **not** cancel the order:
 * a wrong reference is a typo far more often than it's a fraud, and cancelling
 * would release the stock the customer is trying to pay for.
 */
export const reviewPayment = async (req, res) => {
  const { decision, reference, channel, amountReceived, reviewNote } = req.body;

  if (!['confirm', 'reject'].includes(decision)) {
    throw new BadRequestError("Decision must be either 'confirm' or 'reject'.");
  }

  const order = await Order.findById(req.params.id).populate(
    'user',
    'firstName lastName email',
  );
  if (!order) throw new NotFoundError(`No order found with ID: ${req.params.id}`);

  if (SETTLED.includes(order.payment?.status)) {
    throw new BadRequestError('This payment has already been refunded.');
  }

  const note = String(reviewNote || '').trim();
  if (decision === 'reject' && !note) {
    // Without one the customer is told "rejected" and has to ask why, which
    // turns a self-service step back into a support conversation.
    throw new BadRequestError('Say why you are rejecting it — the customer sees this.');
  }
  if (channel && !CHANNELS.includes(channel)) {
    throw new BadRequestError('Choose how the payment came in.');
  }

  const existing = order.payment.verification || {};
  const resolvedReference =
    String(reference || '').trim() || existing.reference || order.payment.transactionId;

  if (decision === 'confirm' && !resolvedReference) {
    throw new BadRequestError(
      'Record the transaction reference — a confirmation with nothing to check against is not a record.',
    );
  }

  const amount =
    amountReceived === undefined || amountReceived === null || amountReceived === ''
      ? money(order)
      : Number(amountReceived);

  if (decision === 'confirm' && (!Number.isFinite(amount) || amount <= 0)) {
    throw new BadRequestError('Enter the amount received.');
  }

  const now = new Date();
  const reviewerId = req.user.id || req.user._id?.toString();

  order.payment.verification = {
    ...(existing.toObject?.() || existing),
    state: decision === 'confirm' ? 'confirmed' : 'rejected',
    reference: resolvedReference,
    channel: channel || existing.channel || order.payment.method || 'other',
    amountReceived: decision === 'confirm' ? amount : undefined,
    reviewedAt: now,
    reviewedBy: reviewerId,
    reviewNote: note || undefined,
  };

  if (decision === 'confirm') {
    order.payment.status = 'paid';
    order.payment.provider = order.payment.provider || 'manual';
    order.payment.transactionId = resolvedReference;
    order.payment.timestamps = order.payment.timestamps || {};
    order.payment.timestamps.completedAt = now;

    // Paying is the signal to start picking it. Anything further along the
    // pipeline stays where it is — a delivered order settled in cash must not
    // walk backwards to processing.
    if (order.status === 'pending') order.status = 'processing';
  } else if (order.payment.status === 'paid') {
    // Reversing an earlier confirmation (a gateway "success" that turned out
    // to be nothing). Back to pending, not failed: `failed` reads as the
    // customer's card being declined, and the order is still live.
    order.payment.status = 'pending';
    if (order.payment.timestamps) order.payment.timestamps.completedAt = undefined;
  }

  await order.save({ validateModifiedOnly: true });

  const email = order.customer?.email || order.user?.email;
  if (email) {
    const template =
      decision === 'confirm'
        ? paymentConfirmed({ order, amount, reference: resolvedReference })
        : paymentRejected({ order, reason: note });
    // Never let the mail step fail the decision — the money is confirmed
    // either way, and `sendTemplate` already swallows and reports.
    await sendTemplate(email, template);
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message:
      decision === 'confirm'
        ? `Payment confirmed for ${order.orderNumber}.`
        : `Marked ${order.orderNumber} as not received.`,
    order: toReviewRow(order),
  });
};
