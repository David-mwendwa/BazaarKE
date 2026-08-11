// Filter option maps for the dashboard list pages.
//
// Categories aren't here any more. They used to be a `CATEGORY_OPTIONS`
// constant built from the hardcoded list at import time; the list is fetched
// from the API now, so a module-level object would have frozen the fallback
// and never seen a category an admin added. Both product pages call
// `categoryOptions(categories)` from `data/categories.js` with what
// `useCategories` gives them instead.

export const STOCK_STATUS_OPTIONS = {
  all: 'All Stock',
  in_stock: 'In Stock',
  out_of_stock: 'Out of Stock',
  backorder: 'Backorder',
  preorder: 'Pre-Order',
};

export const ORDER_STATUS_OPTIONS = {
  all: 'All Statuses',
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
