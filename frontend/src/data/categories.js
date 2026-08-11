/**
 * The storefront's taxonomy.
 *
 * It used to be *only* this array — five entries a developer had to edit and
 * redeploy to change, with no relationship to what the shop actually stocked.
 * They had already drifted apart once: `smarthome` was listed here and matched
 * zero products, so the nav carried a link straight to an empty results page.
 *
 * The live list now comes from `GET /categories`, which an admin manages at
 * `/dashboard/admin/categories`. This array stays as the **fallback** — what
 * renders before the request lands, and what stays on screen if it fails.
 * Every category surface (nav, filter sidebar, home row, dashboard filters)
 * reads it through `useCategories`, never directly, so none of them can end up
 * showing a different list from its neighbour.
 *
 * Keep it in step with the seeded categories (`npm run seed:categories`): it's
 * what a first-time visitor sees for the few hundred milliseconds before the
 * real list arrives, so a stale entry here is a link that flickers and moves.
 */
export const FALLBACK_CATEGORIES = [
  { slug: 'smartphones', label: 'Smartphones' },
  { slug: 'computing', label: 'Computing' },
  { slug: 'gaming', label: 'Gaming' },
  { slug: 'tablets', label: 'Tablets' },
  { slug: 'accessories', label: 'Accessories' },
];

/**
 * Build the `{ value: label }` map `SelectFilter` takes.
 *
 * A function rather than the constant the dashboard used to import, because
 * the list is fetched now — a module-level object would have frozen whatever
 * the fallback was at import time and never updated.
 */
export const categoryOptions = (categories, allLabel = 'All Categories') => ({
  all: allLabel,
  ...Object.fromEntries(categories.map((category) => [category.slug, category.label])),
});
