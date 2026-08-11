/**
 * Presentation helpers for the signed-in account, shared by the navbar's user
 * menu and the profile page so an avatar that renders in one place can't fall
 * back to initials in the other.
 */

/**
 * The API stores a placeholder path (`/images/default-avatar.png`) rather than
 * an empty avatar, and that file doesn't exist in this frontend — treat it as
 * "no picture" so callers fall back to initials.
 */
export const avatarUrl = (user) =>
  user?.avatar?.url && !user.avatar.url.endsWith('default-avatar.png') ? user.avatar.url : '';

export const initials = (user) =>
  `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() ||
  user?.email?.[0]?.toUpperCase() ||
  '?';

export const displayName = (user) =>
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Your account';

/** `user` is the stored role; "Customer" is what it's called everywhere in the UI. */
export const roleLabel = (role) => (role === 'user' ? 'Customer' : role || '');
