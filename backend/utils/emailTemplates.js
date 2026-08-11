/**
 * Every message the app sends, as `{ subject, text, html }`.
 *
 * Both parts are written, not generated from one another: the plain-text half
 * is what a screen reader, a watch notification and a spam filter all read
 * first, and an auto-stripped HTML body reads like debris in all three.
 *
 * The rule the rest of this app follows applies here too — nothing in a
 * message promises something the shop can't do. There is no delivery window,
 * no returns period and no support phone number below, because none of those
 * exist behind the copy.
 */

const BRAND = process.env.SMTP_FROM_NAME || 'BazaarKE';
const storefront = () => process.env.FRONTEND_URL || 'http://localhost:5183';

const formatKsh = (amount) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

/** Anything interpolated into the HTML body goes through this first. */
const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const firstName = (user) => user?.firstName || 'there';

/**
 * One layout for every message: a plain, single-column card.
 *
 * Inline styles and a table-free body on purpose — this has to survive Gmail
 * stripping the `<style>` block and Outlook rendering with Word. Colours match
 * the storefront's teal `primary`; nothing here depends on an image loading,
 * since most clients block them by default.
 */
const layout = ({ heading, body, action }) => `
<div style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e6eb;border-radius:8px;overflow:hidden;">
    <div style="padding:20px 28px;border-bottom:1px solid #eef0f3;">
      <span style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:#0f766e;">${escape(BRAND)}</span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35;font-weight:600;color:#111827;">${escape(heading)}</h1>
      ${body}
      ${
        action
          ? `<p style="margin:24px 0 0;">
               <a href="${escape(action.url)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:6px;">${escape(action.label)}</a>
             </p>
             <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;">
               Or paste this into your browser:<br>${escape(action.url)}
             </p>`
          : ''
      }
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eef0f3;background:#fafbfc;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
        You're receiving this because you have a ${escape(BRAND)} account.
      </p>
    </div>
  </div>
</div>`;

const paragraph = (text) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#374151;">${text}</p>`;

/** A label/value row — order numbers, references, amounts. */
const detail = (label, value) =>
  `<tr>
     <td style="padding:6px 0;font-size:13px;color:#6b7280;">${escape(label)}</td>
     <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;">${escape(value)}</td>
   </tr>`;

const detailTable = (rows) =>
  `<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;border-top:1px solid #eef0f3;border-bottom:1px solid #eef0f3;">
     <tbody>${rows.join('')}</tbody>
   </table>`;

// ---------------------------------------------------------------------------

/** Sent once, on registration. */
export const welcome = ({ user }) => ({
  subject: `Welcome to ${BRAND}`,
  text: [
    `Hi ${firstName(user)},`,
    '',
    `Your ${BRAND} account is ready. You're signed in on the device you registered from — this email is just so you have the address on record.`,
    '',
    'What the account gets you:',
    '  · your order history in one place',
    '  · saved delivery addresses, so checkout is two clicks',
    '  · a wishlist that follows you between devices',
    '',
    `Start browsing: ${storefront()}/products`,
    '',
    "If you didn't create this account, reply and tell us — we'll remove it.",
  ].join('\n'),
  html: layout({
    heading: `Your ${BRAND} account is ready`,
    body:
      paragraph(`Hi ${escape(firstName(user))},`) +
      paragraph(
        `You're already signed in on the device you registered from — this is just so you have the address on record.`,
      ) +
      `<ul style="margin:0 0 4px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">
         <li>Your order history in one place</li>
         <li>Saved delivery addresses, so checkout is two clicks</li>
         <li>A wishlist that follows you between devices</li>
       </ul>` +
      paragraph(
        `<span style="color:#6b7280;font-size:13px;">If you didn't create this account, reply and tell us — we'll remove it.</span>`,
      ),
    action: { label: 'Start browsing', url: `${storefront()}/products` },
  }),
});

/** Sent by `forgotPassword`. The 30 minutes matches `getResetPasswordToken`. */
export const passwordReset = ({ user, resetUrl }) => ({
  subject: `Reset your ${BRAND} password`,
  text: [
    `Hi ${firstName(user)},`,
    '',
    `Someone asked to reset the password on your ${BRAND} account. Open the link below to choose a new one:`,
    '',
    resetUrl,
    '',
    "The link is good for 30 minutes. If this wasn't you, ignore this email — nothing has changed.",
  ].join('\n'),
  html: layout({
    heading: 'Choose a new password',
    body:
      paragraph(`Hi ${escape(firstName(user))},`) +
      paragraph(
        `Someone asked to reset the password on your ${escape(BRAND)} account. The link below is good for <strong>30 minutes</strong>.`,
      ) +
      paragraph(
        `<span style="color:#6b7280;font-size:13px;">If this wasn't you, ignore this email — nothing has changed.</span>`,
      ),
    action: { label: 'Reset my password', url: resetUrl },
  }),
});

/**
 * Sent when an order saves. Says what was ordered and what happens next, and
 * nothing about when it will arrive — there is no delivery SLA behind that.
 */
export const orderPlaced = ({ order }) => {
  const url = `${storefront()}/account/orders`;
  const lines = (order.items || []).map(
    (item) => `  · ${item.quantity} × ${item.name} — ${formatKsh((item.price?.amount || 0) * item.quantity)}`,
  );

  const payingLater = order.payment?.method === 'cash_on_delivery';
  const nextStep = payingLater
    ? 'Pay the rider in cash when it reaches you.'
    : order.payment?.status === 'paid'
      ? "We've recorded your payment and will confirm it against our records."
      : "We'll confirm your payment before the order is packed.";

  return {
    subject: `Order ${order.orderNumber} received`,
    text: [
      `Hi ${order.customer?.name?.split(' ')[0] || 'there'},`,
      '',
      `We've got order ${order.orderNumber}.`,
      '',
      ...lines,
      '',
      `Subtotal: ${formatKsh(order.subtotal?.amount)}`,
      ...(order.discount?.amount
        ? [`Discount${order.discount.code ? ` (${order.discount.code})` : ''}: -${formatKsh(order.discount.amount)}`]
        : []),
      `Delivery: ${order.shipping?.amount ? formatKsh(order.shipping.amount) : 'Free'}`,
      `Total: ${formatKsh(order.total?.amount)}`,
      '',
      nextStep,
      '',
      `Track it here: ${url}`,
    ].join('\n'),
    html: layout({
      heading: `Order ${escape(order.orderNumber)} received`,
      body:
        paragraph(`Hi ${escape(order.customer?.name?.split(' ')[0] || 'there')}, thanks for your order.`) +
        `<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;">
           <tbody>
             ${(order.items || [])
               .map(
                 (item) => `<tr>
                   <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f1f2f4;">
                     ${escape(item.quantity)} × ${escape(item.name)}
                   </td>
                   <td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;border-bottom:1px solid #f1f2f4;white-space:nowrap;">
                     ${escape(formatKsh((item.price?.amount || 0) * item.quantity))}
                   </td>
                 </tr>`,
               )
               .join('')}
           </tbody>
         </table>` +
        detailTable(
          [
            detail('Subtotal', formatKsh(order.subtotal?.amount)),
            order.discount?.amount
              ? detail(
                  `Discount${order.discount.code ? ` (${order.discount.code})` : ''}`,
                  `-${formatKsh(order.discount.amount)}`,
                )
              : '',
            detail('Delivery', order.shipping?.amount ? formatKsh(order.shipping.amount) : 'Free'),
            detail('Total', formatKsh(order.total?.amount)),
          ].filter(Boolean),
        ) +
        paragraph(escape(nextStep)),
      action: { label: 'View your order', url },
    }),
  };
};

/** Sent when an admin confirms the money arrived. */
export const paymentConfirmed = ({ order, amount, reference }) => {
  const short = formatKsh(amount);
  const url = `${storefront()}/account/orders`;

  return {
    subject: `Payment received for ${order.orderNumber}`,
    text: [
      `Hi ${order.customer?.name?.split(' ')[0] || 'there'},`,
      '',
      `We've matched your payment of ${short} to order ${order.orderNumber}.`,
      '',
      `Reference: ${reference}`,
      `Order total: ${formatKsh(order.total?.amount)}`,
      ...(Number(amount) < Number(order.total?.amount || 0)
        ? ['', `That's ${formatKsh((order.total?.amount || 0) - Number(amount))} short of the total — we'll be in touch about the balance.`]
        : []),
      '',
      `Your order: ${url}`,
    ].join('\n'),
    html: layout({
      heading: 'Payment received',
      body:
        paragraph(`Hi ${escape(order.customer?.name?.split(' ')[0] || 'there')},`) +
        paragraph(
          `We've matched your payment of <strong>${escape(short)}</strong> to order <strong>${escape(order.orderNumber)}</strong>.`,
        ) +
        detailTable([
          detail('Reference', reference),
          detail('Order total', formatKsh(order.total?.amount)),
          detail('Received', short),
        ]) +
        (Number(amount) < Number(order.total?.amount || 0)
          ? paragraph(
              `<span style="color:#b45309;">That's ${escape(formatKsh((order.total?.amount || 0) - Number(amount)))} short of the total — we'll be in touch about the balance.</span>`,
            )
          : ''),
      action: { label: 'View your order', url },
    }),
  };
};

/**
 * Sent when an admin can't find the payment. The reason is mandatory upstream
 * precisely so this message can say something useful.
 */
export const paymentRejected = ({ order, reason }) => {
  const url = `${storefront()}/account/orders`;

  return {
    subject: `We couldn't match your payment for ${order.orderNumber}`,
    text: [
      `Hi ${order.customer?.name?.split(' ')[0] || 'there'},`,
      '',
      `We looked for the payment you sent for order ${order.orderNumber} and couldn't match it to anything in our records.`,
      '',
      `What we found: ${reason}`,
      '',
      "Your order is still open — nothing has been cancelled. Check the transaction code on your confirmation message and send it again, and we'll take another look.",
      '',
      `Your order: ${url}`,
    ].join('\n'),
    html: layout({
      heading: "We couldn't match your payment",
      body:
        paragraph(`Hi ${escape(order.customer?.name?.split(' ')[0] || 'there')},`) +
        paragraph(
          `We looked for the payment you sent for order <strong>${escape(order.orderNumber)}</strong> and couldn't match it to anything in our records.`,
        ) +
        `<p style="margin:0 0 12px;padding:12px 14px;background:#fef3c7;border-radius:6px;font-size:13px;line-height:1.6;color:#92400e;">
           ${escape(reason)}
         </p>` +
        paragraph(
          'Your order is still open — nothing has been cancelled. Check the transaction code on your confirmation message and send it again, and we\'ll take another look.',
        ),
      action: { label: 'Resend my transaction code', url },
    }),
  };
};
