// src/context/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import apiClient from '../api/apiClient.js';

const AuthContext = createContext();

const initialState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_REQUEST':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, loading: false, user: action.payload };
    case 'AUTH_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const persistUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'AUTH_SUCCESS', payload: user });
  };

  const persist = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const register = async (formData) => {
    dispatch({ type: 'AUTH_REQUEST' });
    try {
      const res = await apiClient.post('/register', formData);
      persist(res.data.token, res.data.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data.user });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'AUTH_REQUEST' });
    try {
      const res = await apiClient.post('/login', { email, password });
      persist(res.data.token, res.data.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: res.data.user });
      // The user comes back with the result so the caller can route on role
      // immediately — reading it from context instead would race the dispatch.
      return { success: true, user: res.data.user };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  /**
   * Profile mutations live here rather than in a separate user context so the
   * app has exactly one user object. A second store would mean the navbar and
   * the profile page could disagree about your own name after a save.
   *
   * `payload` may be a plain object or a FormData (the profile page sends the
   * latter whenever an avatar is attached); apiClient strips its JSON
   * Content-Type for FormData so the browser can set the multipart boundary.
   */
  const updateProfile = async (payload) => {
    const res = await apiClient.patch('/me/update', payload);
    persistUser(res.data.user);
    return res.data.user;
  };

  /**
   * The API answers a password change with a fresh token (`sendToken`). It has
   * to replace the stored one — the old JWT is still valid today, but the
   * moment a `passwordChangedAt` check is added to the auth middleware, not
   * persisting this would silently sign the user out on their next request.
   */
  const updatePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    const res = await apiClient.patch('/password/update', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (res.data.token) localStorage.setItem('token', res.data.token);
    if (res.data.user) persistUser(res.data.user);
    return res.data;
  };

  const refreshProfile = async () => {
    const res = await apiClient.get('/me');
    persistUser(res.data.user);
    return res.data.user;
  };

  // If a token exists from a previous session, refresh the user profile
  // once on mount so stale localStorage data doesn't silently drift.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !state.user) return;

    apiClient
      .get('/me')
      .then((res) => persistUser(res.data.user))
      .catch(() => logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, register, login, logout, updateProfile, updatePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
