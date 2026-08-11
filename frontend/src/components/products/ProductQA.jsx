import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHelpCircle, FiMessageSquare, FiTrash2 } from 'react-icons/fi';

import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConfirm } from '../../context/ConfirmContext.js';

/**
 * Questions and answers on the product page.
 *
 * The other half of what reviews do. A review tells you how a product turned
 * out for someone who bought it; a question is what a shopper needs to know
 * *before* they buy, answered by the person selling it. "Does it come with the
 * Kenyan plug?" isn't a review and had nowhere to go.
 *
 * Reading is public, for the same reason reading reviews is: people decide
 * whether to buy long before they decide whether to register.
 *
 * Answering appears inline for whoever is allowed to do it — the product's own
 * vendor, or an admin — because the alternative is asking them to leave the
 * page. Vendors also get a queue at `/dashboard/vendor/questions`, which is
 * where they'll actually find these; nobody browses their own product pages
 * looking for unanswered questions.
 */

const PAGE_SIZE = 5;

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

const AnswerForm = ({ questionId, onAnswered }) => {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.post(`/questions/${questionId}/answers`, {
        body: body.trim(),
      });
      toast.success('Answer posted');
      setBody('');
      onAnswered(data.question);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post that answer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className='mt-3 flex flex-col gap-2 sm:flex-row'>
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        placeholder='Answer this…'
        className='h-9 flex-1 rounded-md border border-dark-300 px-3 text-sm focus:border-primary-500 focus:outline-none'
      />
      <button
        type='submit'
        disabled={saving || !body.trim()}
        className='rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
        {saving ? 'Posting…' : 'Post answer'}
      </button>
    </form>
  );
};

const ProductQA = ({ productId, vendorId }) => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [meta, setMeta] = useState({ total: 0, answered: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);

  // Answering is the seller's job, and admins step in when a seller goes quiet.
  const canAnswer =
    user && (user.role === 'admin' || (user.role === 'vendor' && user._id === vendorId));
  // A seller asking a question on their own product is a testimonial with
  // extra steps; the API refuses it, so don't offer the box either.
  const canAsk = user && !canAnswer;

  const load = useCallback(
    (nextPage) =>
      apiClient
        .get(`/products/${productId}/questions`, { params: { page: nextPage, limit: PAGE_SIZE } })
        .then((res) => {
          setQuestions(res.data.questions || []);
          setMeta({
            total: res.data.total,
            answered: res.data.answered,
            totalPages: res.data.totalPages,
          });
        })
        .catch(() => {
          /* A failed Q&A load must not take the product page down with it. */
        }),
    [productId],
  );

  useEffect(() => {
    setLoading(true);
    load(page).finally(() => setLoading(false));
  }, [load, page]);

  const ask = async (e) => {
    e.preventDefault();
    setAsking(true);
    try {
      await apiClient.post(`/products/${productId}/questions`, { body: draft.trim() });
      toast.success("Asked — you'll see the answer here once the seller replies.");
      setDraft('');
      setPage(1);
      await load(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post that question');
    } finally {
      setAsking(false);
    }
  };

  const remove = async (question) => {
    const confirmed = await confirm({
      title: 'Delete your question?',
      message: 'Any answer the seller gave goes with it.',
      confirmLabel: 'Delete question',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/questions/${question._id}`);
      await load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete that question');
    }
  };

  const replaceOne = (updated) =>
    setQuestions((prev) => prev.map((q) => (q._id === updated._id ? updated : q)));

  return (
    <section className='mt-12 border-t border-dark-200 pt-8'>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <h2 className='font-heading text-xl font-bold text-dark-900'>Questions about this product</h2>
        {meta.total > 0 && (
          <p className='text-sm text-dark-500'>
            {meta.answered} of {meta.total} answered
          </p>
        )}
      </div>

      {/* The ask box sits above the list. Someone with a question hasn't got
          one from reading the others, or they wouldn't still be asking. */}
      {canAsk ? (
        <form onSubmit={ask} className='mt-4 rounded-lg border border-dark-200 bg-white p-4'>
          <label htmlFor='ask-question' className='text-sm font-semibold text-dark-800'>
            Ask the seller
          </label>
          <textarea
            id='ask-question'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder='Does it come with a Kenyan plug, or do I need an adapter?'
            className='mt-2 w-full rounded-md border border-dark-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none'
          />
          <div className='mt-2 flex items-center justify-between gap-3'>
            <span className='text-xs text-dark-400 tabular-nums'>{draft.length}/500</span>
            <button
              type='submit'
              disabled={asking || !draft.trim()}
              className='rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
              {asking ? 'Sending…' : 'Ask'}
            </button>
          </div>
        </form>
      ) : !user ? (
        <p className='mt-4 rounded-lg border border-dark-200 bg-white p-4 text-sm text-dark-600'>
          <Link to='/login' className='font-semibold text-primary-700 hover:underline'>
            Sign in
          </Link>{' '}
          to ask the seller a question. Anyone can read the answers.
        </p>
      ) : null}

      {loading ? (
        <div className='mt-4 space-y-3'>
          {[0, 1].map((i) => (
            <div key={i} className='h-20 animate-pulse rounded-lg border border-dark-200 bg-white' />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className='mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-dark-200 py-10 text-center'>
          <FiHelpCircle className='h-7 w-7 text-dark-300' />
          <p className='text-sm font-medium text-dark-700'>No questions yet</p>
          <p className='max-w-sm text-sm text-dark-500'>
            {canAsk
              ? 'Be the first to ask — the seller gets it straight away.'
              : 'Anything asked here is answered by the seller.'}
          </p>
        </div>
      ) : (
        <ul className='mt-4 space-y-3'>
          {questions.map((question) => (
            <li key={question._id} className='rounded-lg border border-dark-200 bg-white p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-sm font-medium text-dark-900'>{question.body}</p>
                  <p className='mt-1 text-xs text-dark-500'>
                    {question.askedBy} · {formatDate(question.createdAt)}
                  </p>
                </div>
                {question.isMine && (
                  <button
                    type='button'
                    onClick={() => remove(question)}
                    className='shrink-0 rounded-md p-1.5 text-dark-400 transition-colors hover:bg-red-50 hover:text-red-600'
                    aria-label='Delete your question'>
                    <FiTrash2 className='h-4 w-4' />
                  </button>
                )}
              </div>

              {question.answers.length > 0 && (
                <ul className='mt-3 space-y-3 border-l-2 border-primary-100 pl-3'>
                  {question.answers.map((answer) => (
                    <li key={answer._id}>
                      <p className='text-sm text-dark-700'>{answer.body}</p>
                      <p className='mt-1 flex items-center gap-1.5 text-xs text-dark-500'>
                        <span className='font-semibold text-dark-700'>{answer.author}</span>
                        {/* The badge is the whole reason an answer here is
                            worth more than a comment — it says this came from
                            the person selling it. */}
                        <span className='rounded-full bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700'>
                          {answer.authorRole === 'admin' ? 'BazaarKE' : 'Seller'}
                        </span>
                        · {formatDate(answer.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {canAnswer && (
                <AnswerForm questionId={question._id} onAnswered={replaceOne} />
              )}

              {!canAnswer && question.answers.length === 0 && (
                <p className='mt-2 flex items-center gap-1.5 text-xs text-dark-400'>
                  <FiMessageSquare className='h-3.5 w-3.5' />
                  Waiting on the seller
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {meta.totalPages > 1 && (
        <div className='mt-4 flex items-center justify-center gap-2'>
          <button
            type='button'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className='rounded-md border border-dark-300 px-3 py-1.5 text-sm text-dark-700 disabled:opacity-40'>
            Previous
          </button>
          <span className='text-sm text-dark-500 tabular-nums'>
            {page} of {meta.totalPages}
          </span>
          <button
            type='button'
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
            className='rounded-md border border-dark-300 px-3 py-1.5 text-sm text-dark-700 disabled:opacity-40'>
            Next
          </button>
        </div>
      )}
    </section>
  );
};

export default ProductQA;
