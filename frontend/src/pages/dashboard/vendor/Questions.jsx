import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MessageSquare, Send } from 'lucide-react';

import apiClient from '../../../api/apiClient.js';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { cn } from '../../../lib/utils';
import ContentSkeleton from '../shared/ContentSkeleton';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';

/**
 * The seller's question queue.
 *
 * Q&A only works if the answers arrive, and a vendor is never going to find
 * unanswered questions by browsing their own product pages. This is where they
 * do — oldest first within unanswered, so whoever has been waiting longest is
 * at the top.
 *
 * Not a `DataTable`: a question is a paragraph with a reply box under it, not
 * a row of fields. Forcing it into columns would truncate the only content
 * that matters.
 */

const TABS = [
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'answered', label: 'Answered' },
  { id: 'all', label: 'All' },
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

const waitingFor = (value) => {
  const days = Math.floor((Date.now() - new Date(value)) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
};

const QuestionCard = ({ question, onAnswered }) => {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.post(`/questions/${question._id}/answers`, {
        body: body.trim(),
      });
      toast.success('Answer posted — it\'s live on the product page.');
      setBody('');
      onAnswered(data.question);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post that answer');
    } finally {
      setSaving(false);
    }
  };

  const stale = !question.isAnswered && Date.now() - new Date(question.createdAt) > 3 * 86400000;

  return (
    <Card>
      <CardContent className='p-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex min-w-0 items-start gap-3'>
            {question.product?.thumbnail && (
              <img
                src={question.product.thumbnail}
                alt=''
                loading='lazy'
                className='h-11 w-11 shrink-0 rounded-md object-contain'
              />
            )}
            <div className='min-w-0'>
              {question.product ? (
                <Link
                  to={`/product/${question.product._id}#questions`}
                  className='line-clamp-1 text-sm font-medium text-primary-700 hover:underline dark:text-primary-400'>
                  {question.product.name}
                </Link>
              ) : (
                <span className='text-sm text-muted-foreground'>Product no longer listed</span>
              )}
              <p className='text-xs text-muted-foreground'>
                {question.askedBy} · {formatDate(question.createdAt)}
              </p>
            </div>
          </div>

          {/* Only shown when it's true. A "waiting 0 days" badge on every card
              would be furniture rather than information. */}
          {stale && (
            <span className='rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'>
              waiting {waitingFor(question.createdAt)}
            </span>
          )}
        </div>

        <p className='mt-3 text-sm font-medium text-foreground'>{question.body}</p>

        {question.answers.length > 0 && (
          <ul className='mt-3 space-y-2 border-l-2 border-primary-200 pl-3 dark:border-primary-800'>
            {question.answers.map((answer) => (
              <li key={answer._id}>
                <p className='text-sm text-muted-foreground'>{answer.body}</p>
                <p className='text-xs text-muted-foreground'>
                  {answer.author} · {formatDate(answer.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {!question.isPublished && (
          <p className='mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'>
            An admin has hidden this question from the product page.
          </p>
        )}

        <form onSubmit={submit} className='mt-3 flex flex-col gap-2 sm:flex-row'>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            placeholder={question.isAnswered ? 'Add another answer…' : 'Answer this…'}
            className='h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm'
          />
          <Button type='submit' size='sm' className='h-9' disabled={saving || !body.trim()}>
            <Send className='mr-2 h-3.5 w-3.5' />
            {saving ? 'Posting…' : 'Post'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const VendorQuestions = () => {
  const [tab, setTab] = useState('unanswered');
  const [questions, setQuestions] = useState([]);
  const [unanswered, setUnanswered] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (page = 1) =>
      apiClient
        .get('/vendor/questions', { params: { state: tab, page, limit: 20 } })
        .then((res) => {
          setQuestions(res.data.questions || []);
          setUnanswered(res.data.unanswered || 0);
          setPagination(res.data.pagination);
        })
        .catch((err) => toast.error(err.response?.data?.message || 'Failed to load questions')),
    [tab],
  );

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  /**
   * After answering, the row stays put and updates in place rather than
   * vanishing from the Unanswered tab mid-read. Reloading the list would move
   * everything under the cursor the moment the reply posts.
   */
  const onAnswered = (updated) =>
    setQuestions((prev) => {
      const next = prev.map((q) => (q._id === updated._id ? { ...q, ...updated } : q));
      setUnanswered((count) => Math.max(0, count - 1));
      return next;
    });

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Questions'
        description={
          unanswered > 0
            ? `${unanswered} shopper${unanswered === 1 ? '' : 's'} waiting on an answer`
            : 'Everything anyone has asked has been answered.'
        }>
        <PageHeaderFilters>
          <div className='flex rounded-md border border-input p-0.5'>
            {TABS.map((t) => (
              <button
                key={t.id}
                type='button'
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                {t.label}
                {t.id === 'unanswered' && unanswered > 0 && (
                  <span className='rounded-full bg-primary-600 px-1.5 text-[11px] font-semibold text-white'>
                    {unanswered}
                  </span>
                )}
              </button>
            ))}
          </div>
        </PageHeaderFilters>
      </PageHeader>

      {loading ? (
        <ContentSkeleton showTable rows={4} columns={2} />
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-14'>
            <MessageSquare className='h-10 w-10 text-muted-foreground' />
            <h3 className='font-medium text-foreground'>
              {tab === 'unanswered' ? 'Nothing waiting' : 'No questions here'}
            </h3>
            <p className='max-w-sm text-center text-sm text-muted-foreground'>
              {tab === 'unanswered'
                ? "Shoppers' questions land here the moment they're asked, and your answer shows on the product page with a Seller badge."
                : 'Questions asked about your products will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='space-y-4'>
            {questions.map((question) => (
              <QuestionCard key={question._id} question={question} onAnswered={onAnswered} />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className='flex items-center justify-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={pagination.page === 1}
                onClick={() => load(pagination.page - 1)}>
                Previous
              </Button>
              <span className='text-sm tabular-nums text-muted-foreground'>
                {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={pagination.page === pagination.pages}
                onClick={() => load(pagination.page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VendorQuestions;
