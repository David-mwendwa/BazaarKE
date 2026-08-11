// src/context/CartContext.jsx
import { createContext, useContext, useReducer, useEffect, useState } from 'react';

import apiClient from '../api/apiClient.js';

const CartContext = createContext();

const STORAGE_KEY = 'bazaarke_cart';
const COUPON_KEY = 'bazaarke_coupon';

const loadInitialCart = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    // Drop rows saved while `GET /product/:id` was stripping `_id` from its
    // response, which is how an item added from the product page ended up
    // with no identifier at all: its cart row linked to `/product/undefined`
    // and its quantity and remove buttons did nothing, because every cart
    // operation keys on `_id`. Dropping such a row is the only repair
    // available — there's nothing left to look the product up by — and it
    // beats leaving a row on screen that can't be removed.
    return JSON.parse(stored)
      .map((item) => (item?._id ? item : { ...item, _id: item?.id }))
      .filter((item) => item._id);
  } catch {
    return [];
  }
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, qty } = action.payload;
      const existing = state.find((item) => item._id === product._id);
      if (existing) {
        return state.map((item) =>
          item._id === product._id
            ? { ...item, qty: item.qty + qty }
            : item
        );
      }
      return [...state, { ...product, qty }];
    }

    case 'SET_QTY': {
      const { productId, qty } = action.payload;
      if (qty <= 0) {
        return state.filter((item) => item._id !== productId);
      }
      return state.map((item) =>
        item._id === productId ? { ...item, qty } : item
      );
    }

    case 'REMOVE_ITEM':
      return state.filter((item) => item._id !== action.payload);

    case 'CLEAR_CART':
      return [];

    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [items, dispatch] = useReducer(reducer, undefined, loadInitialCart);
  // `{ code, discount }`, or null. Only the code is persisted; the amount is
  // re-quoted from the server whenever the basket changes, because a fixed
  // Ksh 2,000 code on a Ksh 20,000 minimum stops applying the moment an item
  // comes out of the cart.
  const [coupon, setCoupon] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1) =>
    dispatch({ type: 'ADD_ITEM', payload: { product, qty } });

  const setQty = (productId, qty) =>
    dispatch({ type: 'SET_QTY', payload: { productId, qty } });

  const removeItem = (productId) =>
    dispatch({ type: 'REMOVE_ITEM', payload: productId });

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    setCoupon(null);
    localStorage.removeItem(COUPON_KEY);
  };

  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.specialPrice || item.price) * item.qty,
    0
  );

  /** @returns {Promise<{ok: boolean, message?: string}>} */
  const applyCoupon = async (code) => {
    try {
      const res = await apiClient.post('/coupons/validate', { code, subtotal });
      setCoupon({ code: res.data.coupon.code, discount: res.data.discount });
      localStorage.setItem(COUPON_KEY, res.data.coupon.code);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Could not apply that code' };
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    localStorage.removeItem(COUPON_KEY);
  };

  // Re-quote on every basket change, and once on load for a code kept from a
  // previous visit. A code that no longer qualifies drops itself rather than
  // showing a discount the server won't honour at checkout.
  useEffect(() => {
    const code = coupon?.code || localStorage.getItem(COUPON_KEY);
    if (!code) return;

    if (subtotal === 0) {
      removeCoupon();
      return;
    }

    let cancelled = false;
    apiClient
      .post('/coupons/validate', { code, subtotal })
      .then((res) => {
        if (cancelled) return;
        setCoupon({ code: res.data.coupon.code, discount: res.data.discount });
        localStorage.setItem(COUPON_KEY, res.data.coupon.code);
      })
      .catch(() => {
        if (!cancelled) removeCoupon();
      });

    return () => {
      cancelled = true;
    };
    // Deliberately keyed on the amount, not on the coupon object this effect
    // sets — including that would re-run it on its own result, forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const discount = coupon?.discount || 0;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        setQty,
        removeItem,
        clearCart,
        itemCount,
        subtotal,
        coupon,
        discount,
        applyCoupon,
        removeCoupon,
      }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

export default CartContext;
