import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiCheck, FiEdit2, FiTrash2 } from 'react-icons/fi';

import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.js';
import { StarInput, StarRating } from './StarRating.jsx';

/**
 * Ratings and reviews on the product page.
 *
 * The product page used to carry a note explaining that reviews were left out
 * because not one of the 901 products had any. The data was missing, not the
 * need — the endpoints existed but wrote to fields the schema doesn't have,
 * so nothing was ever recorded. That's fixed on the server; this is the front
 * of it.
 *
 * One review per person, so the form is "write" or "edit" depending on
 * whether you've already left one, never "add another".
 */

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const reviewerName = (user) => {
  if (!user) return 'A customer';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  // Surname to an initial. Full names on public reviews are more personal
  // information than the review needs to be useful.
  return name
    ? `${user.firstName}${user.lastName ? ` ${user.lastName[0]}.` : ''}`
    : 'A customer';
};

/**
 * The 5→1 bar chart. It answers the question an average can't: whether 4.0
 * means everyone thought it was fine, or half loved it and half were furious.
 */
const Breakdown = ({ breakdown, total }) => (
  <div className='flex-1 space-y-1'>
    {[5, 4, 3, 2, 1].map((star) => {
      const count = breakdown?.[star] || 0;
      const percent = total > 0 ? (count / total) * 100 : 0;

      return (
        <div key={star} className='flex items-center gap-2 text-xs'>
          <span className='w-8 shrink-0 tabular-nums text-dark-500'>{star} ★</span>
          <span className='h-2 flex-1 overflow-hidden rounded-full bg-dark-100'>
            <span
              className='block h-full rounded-full bg-secondary-500'
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className='w-6 shrink-0 text-right tabular-nums text-dark-500'>{count}</span>
        </div>
      );
    })}
  </div>
);

const ReviewForm = ({ existing, onSubmit, onCancel, busy }) => {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error('Please choose a star rating');
      return;
    }
    onSubmit({ rating, comment: comment.trim() });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='rounded-lg border border-dark-200 bg-dark-50/50 p-4'>
      <p className='text-sm font-semibold text-dark-900'>
        {existing ? 'Edit your review' : 'Write a review'}
      </p>

      <div className='mt-3'>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={1000}
        required
        placeholder='What did you think? Anything a future buyer should know?'
        className='mt-3 w-full rounded-md border border-dark-300 px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
      />
      <p className='mt-1 text-right text-xs text-dark-400 tabular-nums'>
        {comment.length}/1000
      </p>

      <div className='mt-3 flex flex-wrap gap-2'>
        <button
          type='submit'
          disabled={busy}
          className='rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
          {busy ? 'Saving…' : existing ? 'Update review' : 'Submit review'}
        </button>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            className='rounded-md border border-dark-300 px-5 py-2 text-sm font-semibold text-dark-700 transition-colors hover:border-dark-400'>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

const ProductReviews = ({ productId, onRatingChange }) => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(
    (nextPage = 1) => {
      setLoading(true);
      apiClient
        .get(`/products/${productId}/reviews`, { params: { page: nextPage, limit: 5 } })
        .then((res) => {
          setData(res.data);
          setPage(nextPage);
        })
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    },
    [productId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const mine = data?.reviews?.find((review) => review.user?._id === user?._id);

  const submit = async ({ rating, comment }) => {
    setBusy(true);
    try {
      const res = await apiClient.post(`/products/${productId}/reviews`, { rating, comment });
      toast.success(res.data.message);
      setEditing(false);
      // The product page's header carries the same average, so it's told
      // rather than left showing the figure from before this review.
      onRatingChange?.(res.data.rating);
      load(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save your review');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (review) => {
    const confirmed = await confirm({
      title: 'Delete your review?',
      message: 'Your rating stops counting towards this product\u2019s average.',
      confirmLabel: 'Delete review',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await apiClient.delete(`/products/${productId}/reviews/${review._id}`);
      toast.success('Review deleted');
      onRatingChange?.(res.data.rating);
      load(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete your review');
    } finally {
      setBusy(false);
    }
  };

  const average = data?.rating?.average || 0;
  const total = data?.rating?.count || 0;

  return (
    <section className='rounded-lg border border-dark-200 bg-white p-5 lg:p-6'>
      <h2 className='font-heading text-lg font-bold text-dark-900'>
        Ratings &amp; reviews
      </h2>

      {loading && !data ? (
        <div className='mt-4 space-y-3'>
          {[0, 1, 2].map((i) => (
            <div key={i} className='h-16 animate-pulse rounded-md bg-dark-100' />
          ))}
        </div>
      ) : total === 0 ? (
        <div className='mt-4'>
          <p className='text-sm text-dark-500'>
            No reviews yet.{' '}
            {user ? 'Be the first to say what you think.' : 'Sign in to be the first.'}
          </p>
          {user ? (
            <div className='mt-4'>
              <ReviewForm onSubmit={submit} busy={busy} />
            </div>
          ) : (
            <Link
              to='/login'
              className='mt-4 inline-block rounded-md border border-dark-300 px-5 py-2 text-sm font-semibold text-dark-700 transition-colors hover:border-primary-500 hover:text-primary-700'>
              Sign in to review
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className='mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8'>
            <div className='shrink-0 text-center sm:text-left'>
              <p className='font-heading text-4xl font-bold tabular-nums text-dark-900'>
                {average.toFixed(1)}
              </p>
              <StarRating value={average} size='md' className='mt-1' />
              <p className='mt-1 text-xs text-dark-500'>
                {total} review{total === 1 ? '' : 's'}
                {data?.rating?.verified?.count > 0 &&
                  ` · ${data.rating.verified.count} verified`}
              </p>
            </div>
            <Breakdown breakdown={data.breakdown} total={total} />
          </div>

          {/* The form, or the prompt to sign in and use it. Above the list:
              someone who came here to leave a review shouldn't have to page
              through other people's first. */}
          <div className='mt-6 border-t border-dark-100 pt-5'>
            {!user ? (
              <p className='text-sm text-dark-500'>
                <Link to='/login' className='font-semibold text-primary-700 hover:underline'>
                  Sign in
                </Link>{' '}
                to leave a review.
              </p>
            ) : editing || !mine ? (
              <ReviewForm
                existing={editing ? mine : null}
                onSubmit={submit}
                onCancel={editing ? () => setEditing(false) : undefined}
                busy={busy}
              />
            ) : (
              <div className='flex flex-wrap items-center justify-between gap-3 rounded-md bg-dark-50 px-4 py-3'>
                <p className='text-sm text-dark-600'>
                  You reviewed this product{' '}
                  <StarRating value={mine.rating} size='sm' className='align-middle' />
                </p>
                <div className='flex gap-3 text-sm'>
                  <button
                    type='button'
                    onClick={() => setEditing(true)}
                    className='flex items-center gap-1.5 font-medium text-primary-700 hover:underline'>
                    <FiEdit2 size={14} />
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => remove(mine)}
                    disabled={busy}
                    className='flex items-center gap-1.5 text-dark-500 hover:text-red-600 disabled:opacity-50'>
                    <FiTrash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <ul className='mt-5 divide-y divide-dark-100 border-t border-dark-100'>
            {data.reviews.map((review) => (
              <li key={review._id} className='py-4'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
                  <StarRating value={review.rating} size='sm' />
                  <span className='text-sm font-medium text-dark-800'>
                    {reviewerName(review.user)}
                  </span>
                  {review.verifiedPurchase && (
                    // Worth a badge because it's checked, not claimed: the
                    // server sets it from a delivered order.
                    <span className='inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700'>
                      <FiCheck size={11} />
                      Verified purchase
                    </span>
                  )}
                  <span className='text-xs text-dark-400'>{formatDate(review.createdAt)}</span>
                </div>
                <p className='mt-1.5 text-sm leading-relaxed text-dark-600'>{review.comment}</p>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 && (
            <div className='mt-4 flex items-center justify-center gap-3'>
              <button
                type='button'
                disabled={page <= 1 || loading}
                onClick={() => load(page - 1)}
                className='rounded-md border border-dark-300 px-3 py-1.5 text-sm disabled:opacity-40'>
                Previous
              </button>
              <span className='text-sm tabular-nums text-dark-500'>
                {page} of {data.totalPages}
              </span>
              <button
                type='button'
                disabled={page >= data.totalPages || loading}
                onClick={() => load(page + 1)}
                className='rounded-md border border-dark-300 px-3 py-1.5 text-sm disabled:opacity-40'>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ProductReviews;
