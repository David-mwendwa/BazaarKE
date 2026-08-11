import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertCircle, FiCheckCircle, FiClock, FiSend } from 'react-icons/fi';

import apiClient from '../../api/apiClient.js';

/**
 * "I've paid — here's the code."
 *
 * The customer half of payment verification. An order can be paid outside the
 * app: M-Pesa sent to the till, a bank transfer, cash handed over. None of
 * that reaches the server on its own, so without this box the only way to tell
 * anyone is to email them, and the order sits looking unpaid.
 *
 * Submitting is a **claim**, not a payment — the copy says so, and the state
 * it writes is separate from the order's payment status. An admin confirms it
 * against the actual statement on `/dashboard/admin/payments`.
 *
 * Not shown on an order that is already paid or cancelled: there is nothing to
 * claim, and a form with no purpose reads as an unfinished step.
 */

const CHANNELS = [
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Something else' },
];

const PaymentReferenceBox = ({ order, onUpdated }) => {
  const claim = order.payment?.verification;
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [channel, setChannel] = useState(
    order.payment?.method === 'bank_transfer' ? 'bank_transfer' : 'mpesa',
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.post(`/orders/${order._id}/payment/reference`, {
        reference: reference.trim(),
        channel,
        payerNote: note.trim(),
      });
      toast.success(data.message);
      setOpen(false);
      setReference('');
      setNote('');
      onUpdated?.(data.verification);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send that just now');
    } finally {
      setSaving(false);
    }
  };

  // Already waiting on us. Showing the form again would invite a duplicate
  // claim for the same money.
  if (claim?.state === 'submitted' && !open) {
    return (
      <div className='mt-3 flex items-start gap-2 rounded-md border border-dark-200 bg-white p-3 text-sm'>
        <FiClock className='mt-0.5 shrink-0 text-primary-600' />
        <div>
          <p className='font-semibold text-dark-800'>
            We're checking your payment
          </p>
          <p className='text-xs text-dark-500'>
            You sent <span className='font-mono text-dark-700'>{claim.reference}</span>. We'll email
            you once it's matched against our records.
          </p>
        </div>
      </div>
    );
  }

  if (claim?.state === 'confirmed') {
    return (
      <div className='mt-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm'>
        <FiCheckCircle className='mt-0.5 shrink-0 text-green-600' />
        <div>
          <p className='font-semibold text-green-800'>Payment confirmed</p>
          <p className='text-xs text-green-700'>
            Matched to <span className='font-mono'>{claim.reference}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='mt-3 rounded-md border border-dark-200 bg-white p-3'>
      {/* A rejection is shown above the form, not instead of it — the next
          thing to do is send the right code, and the reason is what tells them
          which one that is. */}
      {claim?.state === 'rejected' && (
        <div className='mb-3 flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-sm'>
          <FiAlertCircle className='mt-0.5 shrink-0 text-amber-600' />
          <div>
            <p className='font-semibold text-amber-900'>We couldn't match that code</p>
            <p className='text-xs text-amber-800'>{claim.reviewNote}</p>
          </div>
        </div>
      )}

      {!open ? (
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <p className='text-xs text-dark-500'>
            Paid by M-Pesa, transfer or cash? Send us the transaction code and we'll match it to
            this order.
          </p>
          <button
            type='button'
            onClick={() => setOpen(true)}
            className='flex items-center gap-1.5 rounded-md border border-primary-300 px-3 py-1.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50'>
            <FiSend className='h-3.5 w-3.5' />
            {claim?.state === 'rejected' ? 'Send another code' : "I've paid"}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className='space-y-3'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-1 block text-xs font-medium text-dark-600'>
                Transaction code
              </span>
              <input
                required
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                placeholder='TIJ4KX9QAB'
                maxLength={64}
                className='h-9 w-full rounded-md border border-dark-300 px-3 font-mono text-sm uppercase focus:border-primary-500 focus:outline-none'
              />
            </label>

            <label className='block'>
              <span className='mb-1 block text-xs font-medium text-dark-600'>How you paid</span>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className='h-9 w-full rounded-md border border-dark-300 px-3 text-sm focus:border-primary-500 focus:outline-none'>
                {CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className='block'>
            <span className='mb-1 block text-xs font-medium text-dark-600'>
              Anything we should know? (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Sent from a different number'
              maxLength={500}
              className='h-9 w-full rounded-md border border-dark-300 px-3 text-sm focus:border-primary-500 focus:outline-none'
            />
          </label>

          <div className='flex items-center justify-end gap-2'>
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='rounded-md px-3 py-1.5 text-sm text-dark-600 hover:text-dark-900'>
              Cancel
            </button>
            <button
              type='submit'
              disabled={saving || !reference.trim()}
              className='rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
              {saving ? 'Sending…' : 'Send code'}
            </button>
          </div>

          <p className='text-xs text-dark-400'>
            Sending a code doesn't mark the order paid — someone checks it against our records
            first, and you'll get an email either way.
          </p>
        </form>
      )}
    </div>
  );
};

export default PaymentReferenceBox;
