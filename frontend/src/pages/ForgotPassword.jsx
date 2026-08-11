import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiMail } from 'react-icons/fi';

import apiClient from '../api/apiClient.js';
import AuthField from '../components/auth/AuthField.jsx';

/**
 * Request a reset link. The endpoint has existed since the project was
 * scaffolded and nothing on the frontend ever called it — "Forgot password?"
 * was simply missing from the sign-in page.
 *
 * The success state deliberately doesn't say whether the address had an
 * account: the API answers the same way either way, and a page that said
 * "no such user" would give that back.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await apiClient.post('/password/forgot', { email });
      setSent(true);
      // Only ever present outside production, where SMTP isn't configured.
      setDevUrl(res.data.devResetUrl || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='mx-auto max-w-sm py-12 sm:py-16'>
      <div className='rounded-lg border border-dark-200 bg-white p-6 sm:p-8'>
        {sent ? (
          <>
            <span className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700'>
              <FiMail size={22} />
            </span>
            <h1 className='font-heading text-2xl font-bold text-dark-900'>Check your email</h1>
            <p className='mt-2 text-sm text-dark-500'>
              If <span className='font-medium text-dark-700'>{email}</span> has an account, a
              reset link is on its way. It's good for 30 minutes.
            </p>

            {devUrl && (
              // Development only. Without it there's no way to walk through
              // the reset on a machine with no mail server.
              <div className='mt-4 rounded-md border border-secondary-200 bg-secondary-50 p-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-secondary-800'>
                  Development
                </p>
                <p className='mt-1 text-xs text-dark-600'>
                  No mail server is configured, so here's the link:
                </p>
                <a
                  href={devUrl}
                  className='mt-1 block break-all text-xs font-medium text-primary-700 hover:underline'>
                  {devUrl}
                </a>
              </div>
            )}

            <Link
              to='/login'
              className='mt-6 inline-block text-sm font-semibold text-primary-700 hover:underline'>
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className='font-heading text-2xl font-bold text-dark-900'>Forgot password</h1>
            <p className='mt-1 text-sm text-dark-500'>
              Enter your email and we'll send you a link to choose a new one.
            </p>

            {error && (
              <p
                role='alert'
                className='mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>
                <FiAlertCircle className='mt-0.5 shrink-0' size={15} />
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className='mt-6 flex flex-col gap-4'>
              <AuthField
                label='Email'
                name='email'
                type='email'
                required
                autoComplete='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type='submit'
                disabled={busy}
                className='mt-2 w-full rounded-md bg-primary-600 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>

      {!sent && (
        <p className='mt-6 text-center text-sm text-dark-500'>
          Remembered it?{' '}
          <Link to='/login' className='font-semibold text-primary-700 hover:underline'>
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
};

export default ForgotPassword;
