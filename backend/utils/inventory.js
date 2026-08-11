import Product from '../models/Product.js';
import { BadRequestError } from '../errors/customErrors.js';

/**
 * Stock reservation.
 *
 * Stock used to move only when an order was marked **delivered** — which is
 * days after the customer committed to it, and after every other shopper has
 * had the chance to buy the same unit. Nothing checked availability at
 * checkout either, so the last item in the warehouse could be sold any number
 * of times and the oversell only surfaced at fulfilment.
 *
 * Quantity is now taken when the order is placed and given back if it's
 * cancelled. Marking an order delivered no longer touches stock: the unit left
 * the shelf when it was reserved, and decrementing again would double-count.
 *
 * ## Why not a transaction
 *
 * The local Mongo is a standalone (see infra/docker-compose.yml), and
 * multi-document transactions need a replica set. Instead each decrement is
 * itself atomic — a conditional `updateOne` that only matches while enough
 * stock remains — and `reserveStock` unwinds the ones it already took if a
 * later line fails. Two shoppers racing for the last unit can't both match
 * the filter, so exactly one of them wins.
 */

/**
 * Both stages run server-side against the document's current value, so the
 * status can't disagree with the quantity the way it does on the six seeded
 * products that carry `qty: 0` and `status: 'in_stock'`.
 */
const applyDelta = (delta) => [
  { $set: { 'stock.qty': { $add: ['$stock.qty', delta] } } },
  {
    $set: {
      'stock.status': {
        $cond: [{ $gt: ['$stock.qty', 0] }, 'in_stock', 'out_of_stock'],
      },
    },
  },
];

/**
 * Takes stock for every line, or takes none at all.
 *
 * @param {Array<{product: any, quantity: number, name?: string}>} items
 * @throws {BadRequestError} naming the product that ran short
 */
export const reserveStock = async (items) => {
  const taken = [];

  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) continue;

    const result = await Product.updateOne(
      { _id: item.product, 'stock.qty': { $gte: quantity } },
      applyDelta(-quantity)
    );

    if (result.modifiedCount !== 1) {
      // Put back whatever this call already took before failing, so a
      // half-reserved order can't strand stock nobody owns.
      await releaseStock(taken);

      const product = await Product.findById(item.product).select('name stock').lean();
      const available = product?.stock?.qty ?? 0;
      const name = item.name || product?.name || 'An item in your cart';

      throw new BadRequestError(
        available > 0
          ? `${name} — only ${available} left in stock`
          : `${name} is out of stock`
      );
    }

    taken.push({ product: item.product, quantity });
  }

  return taken;
};

/**
 * Gives stock back. Best-effort by design: a cancellation must not fail
 * because one of its products has since been deleted from the catalogue.
 */
export const releaseStock = async (items) => {
  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) continue;

    try {
      await Product.updateOne({ _id: item.product }, applyDelta(quantity));
    } catch (error) {
      console.error('Could not restore stock for product', item.product, error.message);
    }
  }
};
