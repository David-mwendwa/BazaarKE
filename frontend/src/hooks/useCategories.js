import { useEffect, useState } from 'react';

import apiClient from '../api/apiClient.js';
import { FALLBACK_CATEGORIES } from '../data/categories.js';

/**
 * The live category list, shared by every surface that shows one.
 *
 * Eight components need this list — the nav row, the "All categories" panel,
 * the PLP sidebar, the home page's browse row, the 404 page, the PDP's
 * breadcrumb, the vendor product form and both dashboard product filters.
 * Eight `useEffect`s would be eight requests for one small, rarely-changing
 * list, and eight chances for two of them to disagree while they load.
 *
 * So this is a module-level cache with subscribers rather than a context: it
 * fetches once for the whole app, hands every caller the same array, and
 * doesn't need a provider wrapped around anything (the dashboard and the
 * storefront are separate trees, and a provider would have to go around both).
 *
 * Until the request lands, callers get `FALLBACK_CATEGORIES`. Rendering the
 * fallback is deliberate: a header whose category row appears a beat after the
 * rest of the page pushes the content below it down, and the list is nearly
 * always the same five entries anyway. `loading` is exposed for the one screen
 * that genuinely needs to distinguish them (the admin table).
 */

const normalise = (category) => ({
  slug: category.slug,
  // `label` is the name every existing consumer already reads.
  label: category.name,
  description: category.description || '',
  thumbnail: category.thumbnail?.url || null,
  thumbnailAlt: category.thumbnail?.alt || '',
  isFeatured: Boolean(category.isFeatured),
  productCount: category.productCount ?? 0,
});

let cache = null;
let inFlight = null;
const subscribers = new Set();

const publish = (next) => {
  cache = next;
  subscribers.forEach((notify) => notify(next));
};

const load = () => {
  if (inFlight) return inFlight;

  inFlight = apiClient
    .get('/categories')
    .then((res) => {
      const categories = (res.data?.categories || []).map(normalise);
      // An empty list means nobody has run `seed:categories` yet. Publishing it
      // would empty the nav of a shop that plainly has products in it, so the
      // fallback stands.
      if (categories.length) publish(categories);
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/**
 * @param {{ refresh?: boolean }} [options] `refresh` re-fetches on mount —
 *   used by the admin screen after an edit, so the rest of the app picks up
 *   the change without a reload.
 */
export const useCategories = ({ refresh = false } = {}) => {
  const [categories, setCategories] = useState(cache || FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    subscribers.add(setCategories);

    if (cache === null || refresh) {
      setLoading(true);
      load().finally(() => setLoading(false));
    }

    return () => subscribers.delete(setCategories);
  }, [refresh]);

  return { categories, loading, refresh: load };
};

/**
 * Drop the cache so the next `useCategories` re-fetches.
 *
 * Called by the admin screen after a create, edit or delete: the nav in the
 * same tab is reading the old array, and nothing else would tell it.
 */
export const invalidateCategories = () => {
  cache = null;
  load();
};
