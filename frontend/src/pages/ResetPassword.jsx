import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiAlertCircle } from 'react-icons/fi';

import apiClient from '../api/apiClient.js';
import AuthField from '../components/auth/AuthField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_PASSWORD_LENGTH = 6;

/**
 * The page the emailed link opens. The link used to point at the API itself,
 * so there was nothing to open — see the note in `authController.js`.
 *
 * A successful reset returns a session token, so this signs the user in and
 * drops them on the home page rather than making them type the password they
 * just chose into a login form.
 */
const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    try {
      const res = await apiClient.patch(`/password/reset/${token}`, form);
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        await refreshProfile?.();
      }
      toast.success('Password updated — you are signed in');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your password');
    } finally {
      setBusy(false);
    }
  };

  const mismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className='mx-auto max-w-sm py-12 sm:py-16'>
      <div className='rounded-lg border border-dark-200 bg-white p-6 sm:p-8'>
        <h1 className='font-heading text-2xl font-bold text-dark-900'>Choose a new password</h1>
        <p className='mt-1 text-sm text-dark-500'>
          You'll be signed in once it's saved.
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
            label='New password'
            name='password'
            type='password'
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete='new-password'
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            value={form.password}
            onChange={handleChange}
          />
          <AuthField
            label='Confirm new password'
            name='confirmPassword'
            type='password'
            required
            autoComplete='new-password'
            value={form.confirmPassword}
            onChange={handleChange}
          />
          {mismatch && <p className='-mt-2 text-xs text-red-600'>Passwords don't match yet.</p>}
          <button
            type='submit'
            disabled={busy}
            className='mt-2 w-full rounded-md bg-primary-600 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>

      <p className='mt-6 text-center text-sm text-dark-500'>
        Link expired?{' '}
        <Link to='/password/forgot' className='font-semibold text-primary-700 hover:underline'>
          Request a new one
        </Link>
      </p>
    </div>
  );
};

export default ResetPassword;
