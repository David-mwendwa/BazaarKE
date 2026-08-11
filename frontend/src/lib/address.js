/**
 * Address shapes shared between the account address book and the checkout.
 *
 * In their own module rather than exported from a component file, because a
 * file that exports both a component and a constant breaks Fast Refresh.
 */

export const BLANK_ADDRESS = {
  type: 'home',
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  postalCode: '',
  phone: '',
  isDefault: false,
};

/** The lines of an address, in postal order, with the empties dropped. */
export const formatAddressLines = (address) =>
  [
    `${address.firstName || ''} ${address.lastName || ''}`.trim(),
    address.company,
    address.address1,
    address.address2,
    [address.city, address.postalCode].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ].filter(Boolean);
