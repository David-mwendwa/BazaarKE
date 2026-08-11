import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import apiClient from '../api/apiClient.js';
import { useAuth } from './AuthContext.jsx';

const WishlistContext = createContext();

/**
 * Saved products.
 *
 * Server-side only, unlike the cart, which persists to localStorage for
 * signed-out shoppers. A wishlist is worth having precisely because it
 * follows you between devices, and a local one would either be lost at
 * sign-in or need merging with the account's — for a feature whose entire
 * value is "come back to this later", the anonymous half is the part not
 * worth building.
 *
 * So: signed out, the heart is a prompt to sign in rather than a control that
 * silently does nothing.
 *
 * The full product objects are kept, not just their ids, because every write
 * endpoint returns the whole populated list — one round trip per change, and
 * the wishlist page renders straight from this state.
 */
export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // Ids currently mid-request, so a heart can disable just itself rather than
  // the page freezing every heart on it.
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    apiClient
      .get('/me/wishlist')
      .then((res) => setItems(res.data.wishlist || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  const has = useCallback(
    (productId) => items.some((item) => item._id === productId),
    [items]
  );

  const toggle = useCallback(
    async (product) => {
      if (!user) {
        toast.info('Sign in to save products to your wishlist');
        return false;
      }

      const id = product._id;
      const saved = items.some((item) => item._id === id);

      setPending((list) => [...list, id]);
      try {
        const res = saved
          ? await apiClient.delete(`/me/wishlist/${id}`)
          : await apiClient.post('/me/wishlist', { productId: id });

        setItems(res.data.wishlist || []);
        toast.success(saved ? 'Removed from your wishlist' : 'Saved to your wishlist');
        return !saved;
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not update your wishlist');
        return saved;
      } finally {
        setPending((list) => list.filter((item) => item !== id));
      }
    },
    [items, user]
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        loading,
        has,
        toggle,
        isPending: (id) => pending.includes(id),
      }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);

export default WishlistContext;
