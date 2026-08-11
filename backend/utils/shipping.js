/**
 * Delivery rates.
 *
 * Zoned by city with a free-delivery threshold, which is how the Kenyan shops
 * this storefront is modelled on price it. This file is the only place the
 * numbers live: the checkout reads them from `GET /shipping/rates` rather than
 * keeping its own copy, and `newOrder` recomputes the fee here before saving,
 * so a client can't post its own delivery amount.
 *
 * Adjust the figures below and both the quote and the charge move together.
 */

export const SHIPPING_CURRENCY = 'KES';

// Above this subtotal the fee is waived, whatever the zone.
export const FREE_SHIPPING_ABOVE = 50000;

/**
 * Zones are matched in order and the last one is the fallback, so it must
 * carry no city list. City names are matched case- and space-insensitively
 * against the string typed at checkout — an imperfect match by design, since
 * the address form is free text; anything unrecognised lands in the fallback
 * zone, which is the most expensive one, so an unmatched city can never
 * under-charge.
 */
export const SHIPPING_ZONES = [
  {
    id: 'nairobi',
    label: 'Nairobi',
    amount: 300,
    cities: ['nairobi', 'nairobi city', 'westlands', 'karen', 'ruaka', 'kilimani'],
  },
  {
    id: 'major-towns',
    label: 'Major towns',
    amount: 500,
    cities: [
      'mombasa',
      'kisumu',
      'nakuru',
      'eldoret',
      'thika',
      'nyeri',
      'machakos',
      'kiambu',
      'kitengela',
      'naivasha',
      'malindi',
      'kericho',
      'meru',
    ],
  },
  {
    id: 'countrywide',
    label: 'Rest of Kenya',
    amount: 800,
    cities: [],
  },
];

const normalise = (value) => String(value || '').trim().toLowerCase();

export const zoneForCity = (city) => {
  const needle = normalise(city);
  return (
    SHIPPING_ZONES.find((zone) => zone.cities.includes(needle)) ||
    SHIPPING_ZONES[SHIPPING_ZONES.length - 1]
  );
};

/**
 * @returns {{ amount: number, currency: string, zone: string, method: string, free: boolean }}
 */
export const calculateShipping = ({ city, subtotal = 0 }) => {
  const zone = zoneForCity(city);
  const free = subtotal >= FREE_SHIPPING_ABOVE;

  return {
    amount: free ? 0 : zone.amount,
    currency: SHIPPING_CURRENCY,
    zone: zone.id,
    method: zone.label,
    free,
  };
};
