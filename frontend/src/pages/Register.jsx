import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';

import AuthField from '../components/auth/AuthField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_PASSWORD_LENGTH = 6;

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    const result = await register(form);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.message);
    }
  };

  // Checked as you type, not on submit — the second field is the one people
  // get wrong, and finding out after pressing the button means re-typing both.
  const mismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  return (
    <div className='mx-auto max-w-sm py-12 sm:py-16'>
      <div className='rounded-lg border border-dark-200 bg-white p-6 sm:p-8'>
        <h1 className='font-heading text-2xl font-bold text-dark-900'>Create an account</h1>
        <p className='mt-1 text-sm text-dark-500'>
          Save your addresses and keep track of your orders.
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
          <div className='grid grid-cols-2 gap-3'>
            <AuthField
              label='First name'
              name='firstName'
              required
              autoComplete='given-name'
              value={form.firstName}
              onChange={handleChange}
            />
            <AuthField
              label='Last name'
              name='lastName'
              required
              autoComplete='family-name'
              value={form.lastName}
              onChange={handleChange}
            />
          </div>
          <AuthField
            label='Email'
            name='email'
            type='email'
            required
            autoComplete='email'
            value={form.email}
            onChange={handleChange}
          />
          {/* The rule is stated before it's broken, rather than only in the
              error that follows a rejected submit. */}
          <AuthField
            label='Password'
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
            label='Confirm password'
            name='passwordConfirm'
            type='password'
            required
            autoComplete='new-password'
            value={form.passwordConfirm}
            onChange={handleChange}
          />
          {mismatch && (
            <p className='-mt-2 text-xs text-red-600'>Passwords don't match yet.</p>
          )}
          <button
            type='submit'
            disabled={loading}
            className='mt-2 w-full rounded-md bg-primary-600 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-dark-300'>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className='mt-6 text-center text-sm text-dark-500'>
        Already have an account?{' '}
        <Link to='/login' className='font-semibold text-primary-700 hover:underline'>
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Register;
