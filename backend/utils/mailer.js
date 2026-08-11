import nodemailer from 'nodemailer';

/**
 * ## Where a message actually goes
 *
 * This app has two kinds of recipient and they must not share a mail server.
 *
 * Real people who register with a real address should get real email — a
 * welcome message, their order confirmation, a password reset that lands in
 * an inbox they can open.
 *
 * The demo accounts (`demo.customer@bazaarke.dev` and friends), the seeded
 * review accounts, and anything anyone types into the register form while
 * poking at a portfolio app are addresses that don't exist. Pushing those
 * through a live SMTP server generates hard bounces, and enough hard bounces
 * is how a sending domain gets blocked — so they go to a Mailtrap sandbox
 * inbox instead, which accepts everything, delivers nothing onward, and lets
 * you read exactly what would have been sent.
 *
 * `pickRoute` decides per message. `MAIL_MODE` overrides it:
 *
 *   auto     (default) — deliverable addresses live, everything else sandbox
 *   sandbox            — everything to Mailtrap, nothing leaves
 *   live               — everything through the real SMTP server
 *
 * With neither server configured, messages are logged and reported as
 * undelivered. Nothing here ever throws into a request: a welcome email that
 * fails must not fail the registration that triggered it.
 */

/**
 * Domains that are never deliverable.
 *
 * The reserved ones are guaranteed so by RFC 2606 / RFC 6761. `bazaarke.dev`
 * is ours and carries no MX record — it's the suffix every seeded demo
 * account uses, which is precisely why it must not be mailed for real.
 */
const RESERVED = ['example.com', 'example.net', 'example.org', 'bazaarke.dev'];
const RESERVED_TLDS = ['.test', '.example', '.invalid', '.localhost', '.local'];

const extraSandboxDomains = (process.env.MAIL_SANDBOX_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

// Deliberately permissive: this decides which server to hand the address to,
// not whether the address is worth having. Rejecting valid-but-unusual
// addresses (plus tags, long TLDs, quoted locals) would lose real customers,
// and the mail server is the thing that finally knows.
const SYNTAX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** `true` when a live mail server could plausibly deliver to this address. */
export const isDeliverableAddress = (address) => {
  const email = String(address || '').trim().toLowerCase();
  if (!SYNTAX.test(email)) return false;

  const domain = email.split('@')[1];
  if (RESERVED.includes(domain)) return false;
  if (RESERVED_TLDS.some((tld) => domain.endsWith(tld))) return false;
  if (extraSandboxDomains.includes(domain)) return false;

  return true;
};

const configured = (host, user) => Boolean(host && user);

const liveConfig = () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USERNAME || process.env.SMTP_EMAIL,
  pass: process.env.SMTP_PASSWORD,
});

const sandboxConfig = () => ({
  // Mailtrap's sandbox endpoint is fixed, so only the credentials normally
  // need setting — one less thing to get wrong in a .env.
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: Number(process.env.MAILTRAP_PORT) || 2525,
  user: process.env.MAILTRAP_USER,
  pass: process.env.MAILTRAP_PASSWORD,
});

/**
 * Which server this address belongs to, and why.
 *
 * The `reason` is carried through to the send result and the logs, because
 * "the email never arrived" is otherwise indistinguishable from "the email
 * went to Mailtrap, as designed".
 */
export const pickRoute = (address) => {
  const mode = (process.env.MAIL_MODE || 'auto').toLowerCase();
  const live = liveConfig();
  const sandbox = sandboxConfig();

  const liveReady = configured(live.host, live.user);
  const sandboxReady = configured(sandbox.host, sandbox.user);

  const wantsSandbox =
    mode === 'sandbox' || (mode !== 'live' && !isDeliverableAddress(address));

  if (wantsSandbox) {
    if (sandboxReady) {
      return {
        name: 'sandbox',
        config: sandbox,
        reason:
          mode === 'sandbox'
            ? 'MAIL_MODE=sandbox — nothing leaves this machine'
            : 'address is not deliverable (demo or reserved domain)',
      };
    }
    return { name: 'log', reason: 'no Mailtrap credentials (MAILTRAP_USER/MAILTRAP_PASSWORD)' };
  }

  if (liveReady) {
    return { name: 'live', config: live, reason: 'deliverable address' };
  }
  // A real customer's mail is worth keeping somewhere readable rather than
  // dropping because the production server isn't set up yet.
  if (sandboxReady) {
    return { name: 'sandbox', config: sandbox, reason: 'no live SMTP configured — held in sandbox' };
  }
  return { name: 'log', reason: 'no SMTP configured (SMTP_HOST/SMTP_USERNAME)' };
};

// One transport per server, not per message: nodemailer pools connections, and
// building a fresh transport for every email opens and tears down a TLS
// session each time.
const transports = new Map();

const transportFor = ({ name, config }) => {
  if (!transports.has(name)) {
    transports.set(
      name,
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        // 465 is implicit TLS; 587 and 2525 upgrade with STARTTLS.
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
        // Bounded, because registration and the payment decision both await
        // their message. Nodemailer's defaults run to two minutes, which would
        // hang a request behind an unreachable mail host rather than falling
        // through to the logged fallback a few seconds later.
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 15000,
      }),
    );
  }
  return transports.get(name);
};

const fromHeader = () => {
  const name = process.env.SMTP_FROM_NAME || 'BazaarKE';
  const address = process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL || 'no-reply@bazaarke.dev';
  return `${name} <${address}>`;
};

/**
 * Send a rendered template.
 *
 * Resolves to a result rather than throwing — every caller is in the middle of
 * something more important than the email (a registration, a payment
 * decision), and none of them should fail because a mail server was slow.
 * Callers that genuinely need to know (password reset, which has nothing else
 * to offer the user) read `delivered`.
 */
export const sendTemplate = async (to, template, options = {}) => {
  const address = String(to || '').trim();
  if (!address) return { delivered: false, route: 'none', reason: 'no recipient' };

  const route = pickRoute(address);

  if (route.name === 'log') {
    console.warn(
      `[mail] not sent to ${address} — ${route.reason}\n` +
        `       subject: ${template.subject}\n` +
        template.text.replace(/^/gm, '       '),
    );
    return { delivered: false, route: 'log', reason: route.reason, template };
  }

  try {
    await transportFor(route).sendMail({
      from: fromHeader(),
      to: address,
      subject: template.subject,
      text: template.text,
      html: template.html,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    if (route.name === 'sandbox') {
      console.info(`[mail] ${address} → Mailtrap sandbox (${route.reason}): ${template.subject}`);
    }
    return { delivered: true, route: route.name, reason: route.reason };
  } catch (error) {
    console.error(`[mail] send to ${address} failed via ${route.name}:`, error.message);
    return { delivered: false, route: route.name, reason: error.message, template };
  }
};

/** Whether any mail server is reachable at all — used to shape dev fallbacks. */
export const mailConfigured = () => pickRoute('probe@example-real-domain.com').name !== 'log';
