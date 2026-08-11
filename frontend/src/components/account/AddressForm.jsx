import { useState } from 'react';

import { BLANK_ADDRESS } from '../../lib/address.js';

/**
 * The address fields, shared by the account address book and the checkout's
 * "add a new address" panel — so the two can't ask for different things or
 * validate differently. The server requires firstName, lastName, address1,
 * city and phone; those are the ones marked required here.
 */

const Field = ({ label, id, className = '', ...props }) => (
  <div className={className}>
    <label htmlFor={id} className='mb-1.5 block text-xs font-medium text-dark-600'>
      {label}
    </label>
    <input
      id={id}
      className='w-full rounded-md border border-dark-300 px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
      {...props}
    />
  </div>
);

const AddressForm = ({
  initial,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = 'Save address',
  showDefaultToggle = true,
}) => {
  const [form, setForm] = useState({ ...BLANK_ADDRESS, ...initial });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Field
          required
          id='addr-firstName'
          label='First name'
          autoComplete='given-name'
          value={form.firstName}
          onChange={set('firstName')}
        />
        <Field
          required
          id='addr-lastName'
          label='Last name'
          autoComplete='family-name'
          value={form.lastName}
          onChange={set('lastName')}
        />
        <Field
          required
          className='sm:col-span-2'
          id='addr-address1'
          label='Street address'
          autoComplete='address-line1'
          value={form.address1}
          onChange={set('address1')}
        />
        <Field
          className='sm:col-span-2'
          id='addr-address2'
          label='Apartment, building, floor (optional)'
          autoComplete='address-line2'
          value={form.address2}
          onChange={set('address2')}
        />
        {/* City drives the delivery zone, so it's the one optional-looking
            field that actually changes the price. */}
        <Field
          required
          id='addr-city'
          label='City or town'
          autoComplete='address-level2'
          value={form.city}
          onChange={set('city')}
        />
        <Field
          id='addr-postalCode'
          label='Postal code (optional)'
          autoComplete='postal-code'
          value={form.postalCode}
          onChange={set('postalCode')}
        />
        <Field
          required
          id='addr-phone'
          label='Phone number'
          type='tel'
          autoComplete='tel'
          placeholder='07XX XXX XXX'
          value={form.phone}
          onChange={set('phone')}
        />

        <div>
          <label htmlFor='addr-type' className='mb-1.5 block text-xs font-medium text-dark-600'>
            Label
          </label>
          <select
            id='addr-type'
            value={form.type}
            onChange={set('type')}
            className='w-full rounded-md border border-dark-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'>
            <option value='home'>Home</option>
            <option value='work'>Work</option>
            <option value='other'>Other</option>
          </select>
        </div>
      </div>

      {showDefaultToggle && (
        <label className='mt-4 flex items-center gap-2 text-sm text-dark-600'>
          <input
            type='checkbox'
            checked={Boolean(form.isDefault)}
            onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            className='rounded-md border-dark-300 text-primary-600 focus:ring-primary-500'
          />
          Use as my default address
        </label>
      )}

      <div className='mt-5 flex items-center gap-3'>
        <button
          type='submit'
          disabled={busy}
          className='rounded-md bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            className='text-sm font-medium text-dark-600 hover:text-dark-900'>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default AddressForm;
