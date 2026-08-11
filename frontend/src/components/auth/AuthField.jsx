import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

/**
 * One labelled input, shared by Sign in and Create an account so the two
 * forms can't drift.
 *
 * Two things it adds that neither page had:
 *
 *  - **`autoComplete`.** Without it a password manager can't fill either form
 *    reliably, and Chrome logs a console warning about the password field on
 *    every render. It's required, not optional, so a new field can't be added
 *    without deciding what the browser should do with it.
 *  - **A reveal toggle on password fields.** Registration asks for a password
 *    twice precisely because it can't be read back; letting people look is the
 *    cheaper fix, and it makes the "passwords do not match" error avoidable
 *    rather than merely reportable.
 */
const AuthField = ({ label, name, type = 'text', value, onChange, autoComplete, hint, ...rest }) => {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && revealed ? 'text' : type;

  return (
    <div>
      <label htmlFor={name} className='mb-1 block text-sm font-medium text-dark-700'>
        {label}
      </label>
      <div className='relative'>
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`w-full rounded-md border border-dark-300 px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            isPassword ? 'pr-10' : ''
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type='button'
            onClick={() => setRevealed((v) => !v)}
            // The label says what pressing it does, not what state it's in —
            // a screen reader user hears the action, same as a sighted one
            // reads the crossed-out eye.
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className='absolute right-0 top-0 flex h-full items-center px-3 text-dark-400 transition-colors hover:text-dark-700'>
            {revealed ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}
      </div>
      {hint && <p className='mt-1 text-xs text-dark-500'>{hint}</p>}
    </div>
  );
};

export default AuthField;
