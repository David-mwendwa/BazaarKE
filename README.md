<div align="center">

# BazaarKE

**A multi-vendor marketplace for Kenya — built on the MERN stack.**

Shoppers browse a ~900-product catalogue priced in KES. Vendors run their own
storefront, orders and customer questions. Admins run the platform.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Node](https://img.shields.io/badge/Node-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_6-47A248?logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

</div>

---

## Try it

> **Live demo:** _add your Netlify URL here once deployed_
> The API runs on Render's free plan, which sleeps after 15 minutes idle — the
> first page load may take 30–60 seconds to wake it.

The sign-in page has one-click **Demo accounts** buttons that fill the form for
you. No registration needed:

| Role | Email | Password | Lands on |
|---|---|---|---|
| Customer | `demo.customer@bazaarke.dev` | `Demo1234` | Order history |
| Vendor | `demo.vendor@bazaarke.dev` | `Demo1234` | Vendor dashboard |
| Admin | `demo.admin@bazaarke.dev` | `Demo1234` | Admin dashboard |

The customer account comes pre-loaded with orders, saved addresses across three
delivery zones, and a wishlist, so none of those screens are empty on arrival.

> ⚠️ This is a public demo database. The admin login is printed on the sign-in
> page, so anyone can take admin. Don't put real data in it.

## What it does

<details open>
<summary><strong>Storefront</strong></summary>

- **Catalogue** — ~900 real products across six categories, priced in KES
- **Product listing** — category, brand, price-range and rating filters plus
  sorting and pagination, all synced to the URL so any view is shareable and
  survives a refresh or a back button
- **Product detail** — image gallery, sticky buy box, configurable options,
  reviews with verified-purchase badges, and a public Q&A thread
- **Cart** — client-side and persisted to `localStorage`, so a basket survives
  a closed tab without an account
- **Checkout** — three steps (Cart → Delivery → Payment), address picker, promo
  code box, live delivery quote by city
- **Accounts** — order history with status filters, address book, wishlist,
  profile and password management, and a working password-reset flow

</details>

<details open>
<summary><strong>Vendor dashboard</strong> — <code>/dashboard/vendor</code></summary>

- Product CRUD with a markdown editor and image upload
- Orders scoped to that vendor's line items only — never a competitor's
  products, prices or customers
- Order fulfilment: advance orders through `processing → shipped → delivered`
- A question queue showing what's unanswered across their whole catalogue,
  with a "waiting N days" badge
- Sales analytics: revenue, orders, top products, trend charts

</details>

<details open>
<summary><strong>Admin dashboard</strong> — <code>/dashboard/admin</code></summary>

- Every product and order on the platform
- User management with role changes (each one confirmed, with copy that spells
  out what the change actually grants)
- Category CRUD, including a report of orphan slugs — categories products
  reference that no category row describes
- Coupon CRUD with public/private listing
- A payment verification queue: customers submit a payment reference, an admin
  approves or rejects it with a reason, and both decisions email the customer
- Platform analytics with revenue, order and customer breakdowns

</details>

## Engineering notes

The parts I'd point at in a code review:

**Money is computed server-side, always.** `newOrder` rebuilds every line item
from the database and accepts only `product` and `quantity` from the request,
then derives subtotal, discount, shipping and total itself. The version this
replaced trusted client-supplied prices, so a hand-rolled POST could buy the
catalogue for a shilling.

**Stock is reserved at checkout, not at delivery.** Each decrement is a
conditional `updateOne` (`'stock.qty': { $gte: quantity }`) whose
aggregation-pipeline update recomputes `stock.status` from the new quantity in
the same operation — so two shoppers racing for the last unit can't both win,
and the status can never disagree with the count. There are no transactions
(the target Mongo is a standalone), so a partial reservation unwinds itself.

**Order status is a state machine enforced in the API.** A `TRANSITIONS` map
gates every change, with a mirrored copy on the frontend that keeps the
dropdown from offering a move the server will reject. Before it, a cancelled
order could be walked back to processing after its stock had already gone back
on sale and its promo code had been refunded.

**Vendor scoping is a denormalised field, on purpose.** Line items carry a
`vendor` set server-side. Mongoose's strict-query mode silently *drops* filter
conditions on paths absent from the schema — so a missing field here wouldn't
return nothing, it would return every order on the platform.

**Promo codes are platform-funded, and it's one constant.** A vendor is paid
the full price of their line items however much the customer actually paid.
`DISCOUNT_FUNDING` marks the decision and exactly one function acts on it.

**Mail is routed per recipient.** Deliverable addresses go through the live
SMTP server; seeded demo accounts, RFC-reserved domains and syntactic junk go
to a Mailtrap sandbox. Pushing undeliverable addresses through a live server
generates hard bounces, and enough of those is how a sending domain gets
blocked. Sending never throws — a welcome email must not be able to fail a
registration that already succeeded.

**The bundle is split so shoppers never download the dashboard.** The admin and
vendor trees pull in Radix and a data table; they're `React.lazy`-loaded, which
takes initial JS from ~1.2MB to ~330KB. Analytics charts are hand-rolled SVG
for the same reason — Recharts alone is ~100KB.

**Corner radius is a single token.** `--radius` in `index.css` is the only place
rounding is defined; the Tailwind config *overrides* the whole `borderRadius`
scale so no stray utility can reintroduce a hardcoded value.

**Nothing calls `window.confirm`.** A `ConfirmProvider` built on the native
`<dialog>` element supplies `useConfirm()` and `usePrompt()`, getting top-layer
stacking, focus trapping, inert background and Escape from the browser rather
than a hand-rolled overlay.


## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind v3, React Router 7, Radix primitives, axios |
| Backend | Node 20+, Express 4, Mongoose 6, JWT auth |
| Database | MongoDB |
| Images | `sharp` normalisation → Cloudinary, with a local-disk fallback |
| Email | Nodemailer, dual-transport (live SMTP + Mailtrap sandbox) |
| Payments | Stripe, M-Pesa (Daraja), PayPal — all optional |
| Hosting | Netlify (frontend) + Render (API) |

Plain JavaScript throughout, not TypeScript.

## Project structure

```
BazaarKE/
├── backend/
│   ├── controllers/       # request handling + business logic
│   ├── models/            # Product, Order, User, Category, Coupon, Question
│   ├── routes/            # *Routes.js, mounted under /api/v1
│   ├── middleware/        # auth, error handler, M-Pesa OAuth
│   ├── errors/            # typed API errors (NotFoundError, etc.)
│   ├── utils/             # shipping, inventory, mailer, image storage, JWT
│   ├── scripts/           # idempotent seed scripts
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/           # single axios instance + auth interceptor
│       ├── components/    # ui primitives, layout, auth guards, common
│       ├── context/       # Auth, Cart, Wishlist, Confirm
│       ├── hooks/         # useCategories (module-level cache)
│       ├── lib/           # cn, rich text, sanitising, address, payment labels
│       └── pages/         # storefront + dashboard/{vendor,admin}
├── netlify.toml           # frontend deploy config
└── render.yaml            # API deploy blueprint
```

## Running locally

Requires Node 20+ and a MongoDB instance.

```bash
git clone https://github.com/David-mwendwa/BazaarKE.git
cd BazaarKE
npm install && npm run install:all

cp backend/.env.example backend/.env      # fill in MONGO_URI at minimum
cp frontend/.env.example frontend/.env

npm run dev                               # frontend :5183, backend :5002
```

| Command | Does |
|---|---|
| `npm run dev` | Frontend and backend together |
| `npm run server` | API only |
| `npm run build` | Frontend production bundle |
| `npm run install:all` | Install both workspaces |

Only `MONGO_URI` and `JWT_SECRET` are actually required. Cloudinary, SMTP,
Stripe, M-Pesa and PayPal are all optional — the features behind each one
degrade to a visibly disabled state rather than erroring.

### Seed data

The product JSON in `backend/data/` is scraped catalogue data and is **not
committed**, so `seedProducts.js` needs it present locally. Run these in order
once the database is reachable:

```bash
cd backend
node scripts/seedProducts.js   # the catalogue
npm run backfill:vendors       # real vendor attribution — required after seeding
npm run seed:categories
npm run seed:demo-users        # the three accounts the Login buttons fill in
npm run seed:demo-addresses
npm run seed:coupons
npm run seed:demo-reviews
npm run seed:demo-questions
npm run seed:demo-wishlist
```

Every script is idempotent — re-running any of them is safe.

## Deployment

The frontend and API deploy independently.

### Frontend → Netlify

`netlify.toml` is the whole configuration: it builds from `frontend/`,
publishes `frontend/dist`, and adds the SPA fallback redirect.

1. Create a Netlify site from this repository. Build settings come from
   `netlify.toml` — don't override them in the UI.
2. Set `VITE_API_BASE_URL` to `https://<your-render-service>.onrender.com/api/v1`
3. Optionally set `VITE_STRIPE_PUBLISHABLE_KEY` to enable the card option.

Vite inlines `VITE_*` at build time, so changing either requires a redeploy.

### API → Render

`render.yaml` is a Render blueprint. Point a new Blueprint instance at this
repository and it provisions the `bazaarke-api` service with `rootDir: backend`,
`npm start` and a health check on `/api/health`.

Fill in the `sync: false` variables from the dashboard. The required ones:

| Variable | Why |
|---|---|
| `MONGO_URI` | Atlas connection string. Allow Render's egress IPs, or `0.0.0.0/0` on the free plan. |
| `PROD_FRONTEND_URL` | The Netlify site URL, **no trailing slash**. This is the CORS allowlist — the app can't reach the API without it. |
| `PROD_API_URL` | This service's own URL plus `/api/v1`. Uploaded images are stored as absolute URLs built from it. |

`JWT_SECRET` is generated by Render on first deploy.

### Seeding production

Seed scripts read `MONGO_URI` from the shell before `backend/.env` (dotenv
doesn't override an already-set variable), so point them at Atlas without
editing any file:

```bash
cd backend
export MONGO_URI="<your-atlas-connection-string>"
# ...run the same seed sequence as above...
unset MONGO_URI
```

### Deployment caveats

- **Render's free plan sleeps** after 15 minutes idle; the next request
  cold-starts for 30–60s. Upgrade or add an external pinger if that matters.
- **Render's disk is ephemeral.** Without `CLOUDINARY_*`, uploaded images are
  written to `backend/public/uploads/` and vanish on redeploy.
- **Netlify deploy previews are allowed by CORS automatically** — the API
  derives the `<hash>--<site>.netlify.app` pattern from `PROD_FRONTEND_URL`.
- **The password-reset dev shortcut is production-gated.** Outside production
  with SMTP unconfigured, the API returns the reset link in the response so the
  flow is walkable; with `NODE_ENV=production` it never does.

## Known limits

These are deliberate, and documented rather than hidden:

- **Only Cash on Delivery completes a checkout.** M-Pesa and Card disable
  themselves when their keys are unset. The M-Pesa sandbox app has no test
  MSISDN that can approve an STK push, so no automated path can honestly report
  a payment — which is why payment verification is a human queue.
- **Delivery rates are placeholders** (Nairobi 300 / major towns 500 / rest of
  Kenya 800 KES, free above 50,000). Real ones are a business decision.
- **No delivery, returns or warranty copy on product pages.** Those fields are
  empty on every seeded product, and there's no policy behind them — so the
  usual reassurance strip would be a promise the shop can't keep.
- **No analytics traffic or funnel section.** Nothing in the app records a page
  view, so there's no honest number to show.
- **No test suite yet.**

## History

BazaarKE is the successor to **MarketHub** — same problem, rebuilt. The backend
carries MarketHub's Express + Mongoose logic forward, restructured into a
`routes/` + `errors/` layout; the frontend is a fresh Vite build. The original
codebase is preserved on the
[`v2.0.0-legacy`](https://github.com/David-mwendwa/BazaarKE/tree/v2.0.0-legacy)
branch of this repository.

## License

MIT — see [LICENSE](LICENSE).
