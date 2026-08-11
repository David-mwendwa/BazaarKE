import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';

import AuthField from '../components/auth/AuthField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { roleLandingPath } from '../constants/routes';

// Seeded via `npm run seed:demo-users` in backend/ — one account per role,
// so this demo app can be explored without registering a real account.
//
// Deliberately NOT gated behind `import.meta.env.DEV`: the deployed site is a
// portfolio piece whose whole point is being clickable by a stranger, and the
// same accounts are seeded into the production database (see the README).
// The consequence is that the admin login is public — treat this database as
// throwaway, and never seed real data into it.
const DEMO_ACCOUNTS = [
  { role: 'Customer', email: 'demo.customer@bazaarke.dev', password: 'Demo1234' },
  { role: 'Vendor', email: 'demo.vendor@bazaarke.dev', password: 'Demo1234' },
  { role: 'Admin', email: 'demo.admin@bazaarke.dev', password: 'Demo1234' },
];

/**
 * Both auth pages sit on a white card now. Every other surface in the
 * storefront — product tiles, the cart, the buy box, address cards — is a
 * white panel on the page's grey ground; these two forms were the only place
 * inputs floated directly on that grey, which read as an unstyled page rather
 * than a deliberately plain one.
 */
const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      // A `from` means they were bounced off a page they'd asked for — send
      // them back to it. Otherwise land on whatever their role calls home.
      navigate(location.state?.from || roleLandingPath(result.user?.role), {
        replace: true,
      });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className='mx-auto max-w-sm py-12 sm:py-16'>
      <div className='rounded-lg border border-dark-200 bg-white p-6 sm:p-8'>
        <h1 className='font-heading text-2xl font-bold text-dark-900'>Sign in</h1>
        <p className='mt-1 text-sm text-dark-500'>Welcome back to BazaarKE.</p>

        <div className='mt-6 rounded-md border border-primary-100 bg-primary-50 p-4'>
          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700'>
            Demo accounts
          </p>
          <div className='flex gap-2'>
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.role}
                type='button'
                onClick={() => setForm({ email: demo.email, password: demo.password })}
                className='flex-1 rounded-md border border-primary-300 bg-white py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100'>
                {demo.role}
              </button>
            ))}
          </div>
          <p className='mt-2 text-xs text-primary-700/70'>
            Fills the form below — press Sign in to continue.
          </p>
        </div>

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
            value={form.email}
            onChange={handleChange}
          />
          <div>
            <AuthField
              label='Password'
              name='password'
              type='password'
              required
              autoComplete='current-password'
              value={form.password}
              onChange={handleChange}
            />
            {/* The reset endpoint has existed all along with nothing linking
                to it — this was the missing half of the feature. */}
            <div className='mt-1.5 text-right'>
              <Link
                to='/password/forgot'
                className='text-xs font-medium text-primary-700 hover:underline'>
                Forgot password?
              </Link>
            </div>
          </div>
          <button
            type='submit'
            disabled={loading}
            className='mt-2 w-full rounded-md bg-primary-600 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className='mt-6 text-center text-sm text-dark-500'>
        Don't have an account?{' '}
        <Link to='/register' className='font-semibold text-primary-700 hover:underline'>
          Create one
        </Link>
      </p>
    </div>
  );
};

export default Login;
