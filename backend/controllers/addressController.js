import { StatusCodes } from 'http-status-codes';

import User from '../models/User.js';
import { BadRequestError, NotFoundError } from '../errors/customErrors.js';

/**
 * The signed-in user's address book (`User.addresses`, which the schema has
 * always carried but nothing ever wrote to).
 *
 * Two rules hold everywhere in here, because a checkout that has to guess
 * which address to use is worse than one with none:
 *
 *  - exactly one address is the default, and
 *  - the first address saved becomes it automatically.
 *
 * Every write goes through `save()` with `validateModifiedOnly`, so an
 * existing account that predates a schema rule (an empty `phone`, say) can
 * still add an address instead of being blocked by a field it isn't touching.
 */

const FIELDS = [
  'type',
  'firstName',
  'lastName',
  'company',
  'address1',
  'address2',
  'city',
  'state',
  'postalCode',
  'country',
  'phone',
];

// Whitelisted: `isDefault` is set through the rules below, never taken from
// the body, or two addresses could both claim it.
const pick = (body) =>
  FIELDS.reduce((out, key) => {
    if (body[key] !== undefined) out[key] = body[key];
    return out;
  }, {});

const assertRequired = (data) => {
  const missing = ['firstName', 'lastName', 'address1', 'city', 'phone'].filter(
    (key) => !String(data[key] || '').trim()
  );
  if (missing.length) {
    throw new BadRequestError(`Please fill in: ${missing.join(', ')}`);
  }
};

const respond = (res, user, status = StatusCodes.OK) =>
  res.status(status).json({ success: true, addresses: user.addresses });

// GET /api/v1/me/addresses
export const getAddresses = async (req, res) => {
  const user = await User.findById(req.user.id).select('addresses');
  if (!user) throw new NotFoundError('user not found');
  respond(res, user);
};

// POST /api/v1/me/addresses
export const createAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('user not found');

  const data = pick(req.body);
  assertRequired(data);

  // First one in is the default; after that it's only promoted on request.
  const makeDefault = user.addresses.length === 0 || Boolean(req.body.isDefault);
  if (makeDefault) user.addresses.forEach((a) => (a.isDefault = false));

  user.addresses.push({ ...data, country: data.country || 'Kenya', isDefault: makeDefault });
  await user.save({ validateModifiedOnly: true });

  respond(res, user, StatusCodes.CREATED);
};

// PATCH /api/v1/me/addresses/:addressId
export const updateAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('user not found');

  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new NotFoundError('address not found');

  const data = pick(req.body);
  Object.assign(address, data);
  assertRequired(address);

  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;
  }

  await user.save({ validateModifiedOnly: true });
  respond(res, user);
};

// PATCH /api/v1/me/addresses/:addressId/default
export const setDefaultAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('user not found');

  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new NotFoundError('address not found');

  user.addresses.forEach((a) => (a.isDefault = false));
  address.isDefault = true;

  await user.save({ validateModifiedOnly: true });
  respond(res, user);
};

// DELETE /api/v1/me/addresses/:addressId
export const deleteAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new NotFoundError('user not found');

  const address = user.addresses.id(req.params.addressId);
  if (!address) throw new NotFoundError('address not found');

  const wasDefault = address.isDefault;
  // `pull` rather than the subdocument's own remove: this project is on a
  // Mongoose version where `subdoc.deleteOne()` doesn't exist, and `.remove()`
  // is deprecated in newer ones. `pull` is correct in both.
  user.addresses.pull(req.params.addressId);

  // Deleting the default promotes the next one rather than leaving the book
  // with no default — checkout preselects that, and nothing else would.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save({ validateModifiedOnly: true });
  respond(res, user);
};
