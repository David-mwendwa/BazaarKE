import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiUser } from 'react-icons/fi';

import { useAuth } from '../../context/AuthContext.jsx';
import { userMenuItems } from './userMenuItems.js';
import { avatarUrl, displayName, initials } from '../../lib/user.js';

export const UserAvatar = ({ user, size = 'h-9 w-9' }) => {
  const url = avatarUrl(user);

  return url ? (
    <img src={url} alt='' className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-semibold text-white`}>
      {initials(user)}
    </span>
  );
};

/** Desktop header control: avatar + name, opening the role-aware menu. */
const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  // Close on outside click and on Escape — a menu you can only dismiss by
  // picking something from it is a trap, especially on a header that sticks.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (!wrapper.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Navigating away should close it, including a click on the item you're
  // already on (which wouldn't unmount anything).
  useEffect(() => setOpen(false), [location.pathname]);

  if (!user) {
    return (
      <Link
        to='/login'
        className='flex items-center gap-1.5 text-sm font-medium text-dark-700 hover:text-primary-700'>
        <FiUser size={18} />
        Sign in
      </Link>
    );
  }

  return (
    <div className='relative' ref={wrapper}>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup='menu'
        className='flex items-center gap-2 rounded-full p-0.5 pr-2 text-sm font-medium text-dark-700 hover:bg-dark-50 hover:text-primary-700'>
        <UserAvatar user={user} />
        <span className='hidden lg:inline'>{user.firstName || 'Account'}</span>
        <FiChevronDown
          size={16}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden='true'
        />
      </button>

      {open && (
        <div
          role='menu'
          className='absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-dark-200 bg-white py-1 shadow-lg'>
          <div className='border-b border-dark-100 px-4 py-3'>
            <p className='truncate text-sm font-semibold text-dark-900'>{displayName(user)}</p>
            <p className='truncate text-xs text-dark-500'>{user.email}</p>
          </div>

          {userMenuItems(user).map((item) => {
            const Icon = item.icon;
            const className = `flex w-full items-center gap-3 px-4 py-2.5 text-sm ${
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-dark-700 hover:bg-dark-50 hover:text-primary-700'
            }`;

            return (
              <div key={item.label}>
                {item.divider && <div className='my-1 border-t border-dark-100' />}
                {item.action === 'logout' ? (
                  <button
                    type='button'
                    role='menuitem'
                    className={className}
                    onClick={() => {
                      setOpen(false);
                      logout();
                      navigate('/');
                    }}>
                    <Icon size={16} />
                    {item.label}
                  </button>
                ) : (
                  <Link role='menuitem' to={item.to} className={className} onClick={() => setOpen(false)}>
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserMenu;
