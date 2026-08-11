import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext.jsx';
import { avatarUrl, displayName, initials, roleLabel } from '../../lib/user.js';

/**
 * Account profile — ported from MarketHub's `pages/account/ProfilePage.jsx`.
 *
 * Two differences from the original, both deliberate:
 *
 *  - State comes from `AuthContext` instead of a separate `UserContext`. There
 *    is one user object in this app; a second store would let the navbar and
 *    this page disagree about your own name right after a save.
 *  - The change-password form is actually built. MarketHub's page pulls
 *    `updatePassword` out of its context and never renders anything that calls
 *    it, so `PATCH /password/update` was unreachable from the UI.
 */

const FIELD =
  'w-full rounded-md border border-dark-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-dark-50 disabled:text-dark-500';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const Flag = ({ ok, yes, no }) => (
  <span className={`inline-flex items-center gap-1.5 ${ok ? 'text-green-700' : 'text-amber-700'}`}>
    {ok ? <CheckCircle className='h-4 w-4' /> : <AlertCircle className='h-4 w-4' />}
    {ok ? yes : no}
  </span>
);

const ProfilePage = () => {
  const { user, updateProfile, updatePassword } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [errors, setErrors] = useState({});

  // `avatarFile` is the pending change: a File to upload, the string 'REMOVE'
  // to clear, or null for "leave it alone". `preview` is what's on screen.
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInput = useRef(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Seed the form from the account, and re-seed whenever it changes — the
  // context refetches `/me` on mount, so the first render can be stale.
  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
    });
    setPreview(avatarUrl(user));
    setAvatarFile(null);
  }, [user]);

  // Object URLs are the browser's, not the garbage collector's — without this
  // every picture picked in a session leaks until the tab closes.
  useEffect(() => {
    if (!(avatarFile instanceof File)) return undefined;
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still fires a change.
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Images must be 5MB or smaller.');

    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile('REMOVE');
    setPreview('');
  };

  const cancelEdit = () => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
    setPreview(avatarUrl(user));
    setAvatarFile(null);
    setErrors({});
    setIsEditing(false);
  };

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    // Matches the phone validator on the User schema, so a number that would
    // be rejected on save is caught before the round trip.
    if (form.phone.trim() && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/.test(form.phone.trim())) {
      next.phone = 'Enter a valid phone number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // Multipart only when a file is actually attached; a plain object keeps
      // the common "renamed myself" save a normal JSON request.
      let payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
      };

      if (avatarFile) {
        const data = new FormData();
        Object.entries(payload).forEach(([key, value]) => data.append(key, value));
        if (avatarFile === 'REMOVE') data.append('removeAvatar', 'true');
        else data.append('avatar', avatarFile);
        payload = data;
      }

      await updateProfile(payload);
      setAvatarFile(null);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');
    if (newPassword === currentPassword) return toast.error('New password matches your current one.');

    setChangingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword, confirmPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // ProtectedRoute guarantees a session, but the context refetches `/me` on
  // mount and briefly has nothing to show on a cold load.
  if (!user) {
    return (
      <div className='flex justify-center py-24'>
        <Loader2 className='h-6 w-6 animate-spin text-primary-600' />
        <span className='sr-only'>Loading profile…</span>
      </div>
    );
  }

  const showInitials = !preview;

  return (
    <div>
      <div className='mb-6 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='font-heading text-2xl font-bold text-dark-900'>My profile</h1>
          <p className='mt-1 text-sm text-dark-500'>View and manage your personal information</p>
        </div>
        <div className='flex items-center gap-3'>
          {/* Everyone gets this. It points at orders *this account placed*,
              which is a different list from the dashboard's — that one is
              orders to fulfil, or every order on the platform. A vendor who
              buys something needs the same link a customer does. */}
          <Link to='/account/orders' className='text-sm font-semibold text-primary-700 hover:underline'>
            My orders
          </Link>
          {!isEditing && (
            <button
              type='button'
              onClick={() => setIsEditing(true)}
              className='inline-flex items-center gap-2 rounded-md border border-dark-300 bg-white px-3 py-2 text-sm font-semibold text-dark-700 hover:bg-dark-50'>
              <Pencil className='h-4 w-4' />
              Edit profile
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className='rounded-lg border border-dark-200 bg-white'>
        <div className='flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start'>
          <div className='flex flex-col items-center gap-2'>
            <div className='relative h-24 w-24 overflow-hidden rounded-full bg-dark-100'>
              {showInitials ? (
                <span className='flex h-full w-full items-center justify-center text-2xl font-semibold text-dark-600'>
                  {initials(user)}
                </span>
              ) : (
                <img src={preview} alt='' className='h-full w-full object-cover' />
              )}
            </div>

            {isEditing && (
              // Buttons under the picture rather than an overlay on it: a
              // hover-only control is unreachable on a touch screen, which is
              // most of the traffic a storefront account page gets.
              <div className='flex items-center gap-1'>
                <input
                  ref={fileInput}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handlePick}
                />
                <button
                  type='button'
                  onClick={() => fileInput.current?.click()}
                  className='rounded-md px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50'>
                  Change
                </button>
                {(preview || avatarUrl(user)) && (
                  <button
                    type='button'
                    onClick={handleRemoveAvatar}
                    className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50'>
                    <Trash2 className='h-3 w-3' />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          <div className='w-full flex-1'>
            {isEditing ? (
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <label htmlFor='firstName' className='mb-1 block text-sm font-medium text-dark-700'>
                    First name
                  </label>
                  <input
                    id='firstName'
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    disabled={saving}
                    className={`${FIELD} ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && <p className='mt-1 text-xs text-red-600'>{errors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor='lastName' className='mb-1 block text-sm font-medium text-dark-700'>
                    Last name
                  </label>
                  <input
                    id='lastName'
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    disabled={saving}
                    className={`${FIELD} ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && <p className='mt-1 text-xs text-red-600'>{errors.lastName}</p>}
                </div>
                <div>
                  <label htmlFor='phone' className='mb-1 block text-sm font-medium text-dark-700'>
                    Phone
                  </label>
                  <input
                    id='phone'
                    type='tel'
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={saving}
                    className={`${FIELD} ${errors.phone ? 'border-red-500' : ''}`}
                  />
                  {errors.phone && <p className='mt-1 text-xs text-red-600'>{errors.phone}</p>}
                </div>
                <div>
                  <label htmlFor='email' className='mb-1 block text-sm font-medium text-dark-700'>
                    Email
                  </label>
                  <input id='email' value={user.email} disabled className={FIELD} />
                  <p className='mt-1 text-xs text-dark-500'>
                    Your email is your sign-in — contact support to change it.
                  </p>
                </div>
              </div>
            ) : (
              <div className='text-center sm:text-left'>
                <h2 className='font-heading text-xl font-bold text-dark-900'>{displayName(user)}</h2>
                <p className='text-sm text-dark-600'>{user.email}</p>
                <p className='mt-1 text-sm text-dark-500'>Member since {formatDate(user.createdAt)}</p>
              </div>
            )}
          </div>
        </div>

        <div className='border-t border-dark-200 px-6 py-5'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <h3 className='font-heading text-base font-bold text-dark-900'>Account details</h3>
            {isEditing && (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={cancelEdit}
                  disabled={saving}
                  className='inline-flex items-center gap-1.5 rounded-md border border-dark-300 bg-white px-3 py-2 text-sm font-semibold text-dark-700 hover:bg-dark-50 disabled:opacity-50'>
                  <X className='h-4 w-4' />
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50'>
                  {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}
          </div>

          <dl className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <div>
              <dt className='text-sm font-medium text-dark-500'>Phone</dt>
              <dd className='mt-0.5 text-sm text-dark-900'>{user.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-dark-500'>Email verified</dt>
              <dd className='mt-0.5 text-sm'>
                <Flag ok={user.isEmailVerified} yes='Verified' no='Not verified' />
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-dark-500'>Account status</dt>
              <dd className='mt-0.5 text-sm'>
                <Flag ok={user.isActive !== false} yes='Active' no='Inactive' />
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-dark-500'>Role</dt>
              <dd className='mt-0.5 text-sm capitalize text-dark-900'>{roleLabel(user.role)}</dd>
            </div>
          </dl>
        </div>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className='mt-6 rounded-lg border border-dark-200 bg-white p-6'>
        <h3 className='font-heading text-base font-bold text-dark-900'>Change password</h3>
        <p className='mt-1 text-sm text-dark-500'>
          You'll stay signed in on this device after changing it.
        </p>

        <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div>
            <label htmlFor='currentPassword' className='mb-1 block text-sm font-medium text-dark-700'>
              Current password
            </label>
            <input
              id='currentPassword'
              type='password'
              autoComplete='current-password'
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              disabled={changingPassword}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor='newPassword' className='mb-1 block text-sm font-medium text-dark-700'>
              New password
            </label>
            <input
              id='newPassword'
              type='password'
              autoComplete='new-password'
              required
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              disabled={changingPassword}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor='confirmPassword' className='mb-1 block text-sm font-medium text-dark-700'>
              Confirm new password
            </label>
            <input
              id='confirmPassword'
              type='password'
              autoComplete='new-password'
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              disabled={changingPassword}
              className={FIELD}
            />
          </div>
        </div>

        <button
          type='submit'
          disabled={changingPassword}
          className='mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50'>
          {changingPassword && <Loader2 className='h-4 w-4 animate-spin' />}
          {changingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
