import { StatusCodes } from 'http-status-codes';
import slugify from 'slugify';

import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { BadRequestError, NotFoundError } from '../errors/customErrors.js';

/**
 * Categories, admin-managed.
 *
 * The storefront read its taxonomy from a hardcoded array
 * (`frontend/src/data/categories.js`) — five entries that only a developer
 * could change, and which had already drifted once (`smarthome` was listed
 * with zero products behind it, a nav link straight to an empty page). This is
 * that list, editable, with the product counts attached so the drift is
 * visible instead of discovered by a shopper.
 *
 * `Product.category` holds the slug, so see `Category.renameSlug` for why
 * changing one is a two-step move rather than a field edit.
 */

const shape = (category, counts) => ({
  _id: category._id,
  name: category.name,
  slug: category.slug,
  description: category.description || '',
  thumbnail: category.thumbnail?.url ? category.thumbnail : null,
  parent: category.parent || null,
  displayOrder: category.displayOrder ?? 0,
  isActive: category.isActive !== false,
  isFeatured: Boolean(category.isFeatured),
  productCount: counts?.get(category.slug) ?? 0,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

/**
 * GET /api/v1/categories
 *
 * Public by default: active categories only, in display order. Admins pass
 * `?includeInactive=true` for the management table.
 */
export const getCategories = async (req, res) => {
  const includeInactive =
    req.query.includeInactive === 'true' && req.user?.role === 'admin';

  const [categories, counts] = await Promise.all([
    Category.find(includeInactive ? {} : { isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean(),
    Category.productCounts(),
  ]);

  const payload = categories.map((category) => shape(category, counts));

  // Slugs that products use but no category row describes. Only an admin
  // needs to see them, and only they can act on it — but they are exactly the
  // drift this screen exists to catch, so they're surfaced rather than
  // silently excluded from the counts.
  const orphans =
    req.user?.role === 'admin'
      ? [...counts.entries()]
          .filter(([slug]) => slug && !categories.some((c) => c.slug === slug))
          .map(([slug, count]) => ({ slug, productCount: count }))
          .sort((a, b) => b.productCount - a.productCount)
      : [];

  res.status(StatusCodes.OK).json({
    success: true,
    count: payload.length,
    categories: payload,
    ...(orphans.length ? { orphans } : {}),
  });
};

/** GET /api/v1/categories/:id — by slug, or by id if that's what you have. */
export const getCategory = async (req, res) => {
  const key = req.params.id;
  const counts = await Category.productCounts();

  const category = /^[0-9a-fA-F]{24}$/.test(key)
    ? await Category.findById(key).lean()
    : await Category.findOne({ slug: key.toLowerCase() }).lean();

  if (!category) throw new NotFoundError(`No category found for "${key}"`);

  res.status(StatusCodes.OK).json({ success: true, category: shape(category, counts) });
};

const readBody = (body) => {
  const fields = {};

  if (body.name !== undefined) fields.name = String(body.name).trim();
  if (body.description !== undefined) fields.description = String(body.description).trim();
  if (body.displayOrder !== undefined) fields.displayOrder = Number(body.displayOrder) || 0;
  if (body.isActive !== undefined) fields.isActive = Boolean(body.isActive);
  if (body.isFeatured !== undefined) fields.isFeatured = Boolean(body.isFeatured);
  if (body.parent !== undefined) fields.parent = body.parent || null;

  // Sent as `{ url, alt }`, or `null` to remove the image entirely. An absent
  // key leaves whatever is stored alone — a form that doesn't touch the image
  // must not clear it.
  if (body.thumbnail !== undefined) {
    fields.thumbnail = body.thumbnail?.url
      ? { url: String(body.thumbnail.url).trim(), alt: String(body.thumbnail.alt || '').trim() }
      : undefined;
  }

  return fields;
};

/** POST /api/v1/categories — admin. */
export const createCategory = async (req, res) => {
  const fields = readBody(req.body);

  if (!fields.name) throw new BadRequestError('Give the category a name.');

  const slug = String(req.body.slug || '').trim().toLowerCase() ||
    slugify(fields.name, { lower: true, strict: true });

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new BadRequestError(
      'The URL segment can only contain lowercase letters, numbers and hyphens.',
    );
  }

  if (await Category.exists({ slug })) {
    throw new BadRequestError(`"${slug}" is already used by another category.`);
  }
  if (await Category.exists({ name: fields.name })) {
    throw new BadRequestError(`A category called "${fields.name}" already exists.`);
  }

  const category = await Category.create({ ...fields, slug });
  const counts = await Category.productCounts();

  res
    .status(StatusCodes.CREATED)
    .json({ success: true, category: shape(category.toObject(), counts) });
};

/**
 * PATCH /api/v1/categories/:id — admin.
 *
 * A slug change is the interesting case: it re-homes every product currently
 * filed under the old one, and the response reports how many moved so the
 * admin sees that it happened rather than discovering an empty category later.
 */
export const updateCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new NotFoundError('That category no longer exists.');

  const fields = readBody(req.body);

  if (fields.name && fields.name !== category.name) {
    if (await Category.exists({ name: fields.name, _id: { $ne: category._id } })) {
      throw new BadRequestError(`A category called "${fields.name}" already exists.`);
    }
  }

  if (fields.parent && String(fields.parent) === String(category._id)) {
    throw new BadRequestError("A category can't be its own parent.");
  }

  Object.assign(category, fields);

  let moved = 0;
  const nextSlug = String(req.body.slug || '').trim().toLowerCase();

  if (nextSlug && nextSlug !== category.slug) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nextSlug)) {
      throw new BadRequestError(
        'The URL segment can only contain lowercase letters, numbers and hyphens.',
      );
    }
    if (await Category.exists({ slug: nextSlug, _id: { $ne: category._id } })) {
      throw new BadRequestError(`"${nextSlug}" is already used by another category.`);
    }
    // Saves the other edits first, so the rename's product move is the last
    // thing that can fail.
    await category.save();
    ({ moved } = await Category.renameSlug(category, nextSlug));
  } else {
    await category.save();
  }

  const counts = await Category.productCounts();

  res.status(StatusCodes.OK).json({
    success: true,
    category: shape(category.toObject(), counts),
    ...(moved
      ? { message: `Renamed, and moved ${moved} product${moved === 1 ? '' : 's'} to /${nextSlug}.` }
      : {}),
  });
};

/**
 * DELETE /api/v1/categories/:id — admin.
 *
 * Refuses while products are still filed under the slug. Deleting the row
 * wouldn't delete them, it would strand them: they'd stay listed and
 * searchable with a category nothing describes and no nav link pointing at
 * them. `?moveTo=<slug>` re-files them first, and is the only way through.
 */
export const deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new NotFoundError('That category no longer exists.');

  const inUse = await Product.countDocuments({ category: category.slug });
  const moveTo = String(req.query.moveTo || '').trim().toLowerCase();

  if (inUse > 0 && !moveTo) {
    throw new BadRequestError(
      `${inUse} product${inUse === 1 ? ' is' : 's are'} still in ${category.name}. ` +
        'Move them to another category first, or hide this one instead of deleting it.',
    );
  }

  let moved = 0;
  if (inUse > 0) {
    const destination = await Category.findOne({ slug: moveTo });
    if (!destination) throw new BadRequestError(`No category with the URL segment "${moveTo}".`);
    if (String(destination._id) === String(category._id)) {
      throw new BadRequestError("You can't move products into the category you're deleting.");
    }

    const result = await Product.updateMany(
      { category: category.slug },
      { $set: { category: destination.slug } },
    );
    moved = result.modifiedCount || 0;
  }

  // Sub-categories would otherwise keep a `parent` pointing at a deleted row.
  await Category.updateMany({ parent: category._id }, { $set: { parent: null } });
  await category.deleteOne();

  res.status(StatusCodes.OK).json({
    success: true,
    message: moved
      ? `Deleted ${category.name} and moved ${moved} product${moved === 1 ? '' : 's'} to /${moveTo}.`
      : `Deleted ${category.name}.`,
  });
};
