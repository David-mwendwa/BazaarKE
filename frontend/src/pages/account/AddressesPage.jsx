import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiBriefcase, FiCheck, FiEdit2, FiHome, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi';

import apiClient from '../../api/apiClient.js';
import { useConfirm } from '../../context/ConfirmContext.js';
import AddressForm from '../../components/account/AddressForm.jsx';
import { BLANK_ADDRESS, formatAddressLines } from '../../lib/address.js';

/**
 * The address book, at `/account/addresses`.
 *
 * It lives in the account area rather than only inside checkout for the same
 * reason Jumia and Konga put it there: managing addresses and using one are
 * different jobs. Checkout is where you *pick* (and may add one in passing);
 * this is where you rename, correct or delete them, without a basket and
 * without the pressure of a half-finished order.
 *
 * Exactly one address is the default and the server enforces it — this page
 * never has to reason about two cards both claiming the badge.
 */

const TYPE_ICON = { home: FiHome, work: FiBriefcase, other: FiMapPin };

const AddressCard = ({ address, onEdit, onDelete, onMakeDefault, busy }) => {
  const Icon = TYPE_ICON[address.type] || FiMapPin;
  const lines = formatAddressLines(address);

  return (
    <li
      className={`flex flex-col rounded-lg border bg-white p-4 transition-colors ${
        address.isDefault ? 'border-primary-500 ring-1 ring-primary-500' : 'border-dark-200'
      }`}>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-dark-500'>
          <Icon size={14} />
          {address.type || 'home'}
        </span>
        {address.isDefault && (
          <span className='inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700'>
            <FiCheck size={12} />
            Default
          </span>
        )}
      </div>

      <p className='text-sm font-semibold text-dark-900'>{lines[0]}</p>
      <address className='mt-0.5 not-italic text-sm leading-relaxed text-dark-600'>
        {lines.slice(1).map((line) => (
          <span key={line} className='block'>
            {line}
          </span>
        ))}
      </address>

      <div className='mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-sm'>
        <button
          type='button'
          onClick={onEdit}
          className='flex items-center gap-1.5 font-medium text-primary-700 hover:underline'>
          <FiEdit2 size={14} />
          Edit
        </button>
        {!address.isDefault && (
          <>
            <button
              type='button'
              disabled={busy}
              onClick={onMakeDefault}
              className='font-medium text-dark-600 hover:text-primary-700 disabled:opacity-50'>
              Set as default
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={onDelete}
              className='ml-auto flex items-center gap-1.5 text-dark-500 hover:text-red-600 disabled:opacity-50'>
              <FiTrash2 size={14} />
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
};

const AddressesPage = () => {
  const confirm = useConfirm();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const formRef = useRef(null);

  // The form sits above the list, so pressing Edit on a card further down
  // would otherwise change something off-screen and look like a dead button.
  useEffect(() => {
    if (editing) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [editing]);

  useEffect(() => {
    apiClient
      .get('/me/addresses')
      .then((res) => setAddresses(res.data.addresses || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Could not load your addresses'))
      .finally(() => setLoading(false));
  }, []);

  const mutate = async (request, message) => {
    setBusy(true);
    try {
      const res = await request();
      setAddresses(res.data.addresses || []);
      if (message) toast.success(message);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async (data) => {
    const ok = await mutate(
      () =>
        data._id
          ? apiClient.patch(`/me/addresses/${data._id}`, data)
          : apiClient.post('/me/addresses', data),
      data._id ? 'Address updated' : 'Address saved'
    );
    if (ok) setEditing(null);
  };

  const remove = async (address) => {
    const confirmed = await confirm({
      title: 'Delete this address?',
      message: 'Orders already shipped to it keep the address they were sent to.',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    mutate(() => apiClient.delete(`/me/addresses/${address._id}`), 'Address deleted');
  };

  const makeDefault = (address) =>
    mutate(() => apiClient.patch(`/me/addresses/${address._id}/default`), 'Default address updated');

  return (
    <div className='pb-16'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='font-heading text-2xl font-bold text-dark-900'>Addresses</h1>
          <p className='mt-1 text-sm text-dark-500'>
            The default one is filled in for you at checkout.
          </p>
        </div>
        {!editing && (
          <button
            type='button'
            onClick={() => setEditing({ ...BLANK_ADDRESS })}
            className='flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700'>
            <FiPlus size={16} />
            Add address
          </button>
        )}
      </div>

      {editing && (
        <div ref={formRef} className='mb-6 rounded-lg border border-dark-200 bg-white p-5'>
          <h2 className='mb-4 font-heading text-lg font-bold text-dark-900'>
            {editing._id ? 'Edit address' : 'New address'}
          </h2>
          <AddressForm
            // Keyed by which address is being edited, so switching targets
            // remounts the form with the new values. `AddressForm` seeds its
            // state from `initial` once, at mount — without this, pressing
            // Edit while the form was already open changed the heading and
            // nothing else, leaving you editing one address in a form still
            // showing another's fields.
            key={editing._id || 'new'}
            initial={editing}
            busy={busy}
            // The first address is the default whatever the checkbox says, so
            // the form hides it rather than offering a choice that isn't one.
            showDefaultToggle={addresses.length > 0 && !editing.isDefault}
            submitLabel={editing._id ? 'Save changes' : 'Save address'}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {loading ? (
        <p className='py-12 text-center text-dark-500'>Loading…</p>
      ) : addresses.length === 0 ? (
        !editing && (
          <div className='flex flex-col items-center rounded-lg border border-dashed border-dark-300 py-14 text-center'>
            <span className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-dark-100 text-dark-400'>
              <FiMapPin size={22} />
            </span>
            <h2 className='font-heading text-lg font-bold text-dark-900'>No addresses saved</h2>
            <p className='mt-1 max-w-sm text-sm text-dark-500'>
              Save one and checkout fills itself in — you won't type it again.
            </p>
            <button
              type='button'
              onClick={() => setEditing({ ...BLANK_ADDRESS })}
              className='mt-5 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700'>
              Add your first address
            </button>
          </div>
        )
      ) : (
        <ul className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {addresses.map((address) => (
            <AddressCard
              key={address._id}
              address={address}
              busy={busy}
              onEdit={() => setEditing({ ...BLANK_ADDRESS, ...address })}
              onDelete={() => remove(address)}
              onMakeDefault={() => makeDefault(address)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressesPage;
