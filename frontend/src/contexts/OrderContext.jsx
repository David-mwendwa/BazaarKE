import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { toast } from 'react-toastify';
import orderService from '../services/order';
import { useAuth } from './AuthContext';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Create a new order
  const createOrder = useCallback(async (orderData) => {
    setLoading(true);
    setError(null);
    try {
      const newOrder = await orderService.createOrder(orderData);
      setCurrentOrder(newOrder);
      return newOrder;
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(err.response?.data?.message || 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch order by ID
  const getOrderById = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);
    try {
      const order = await orderService.getOrderById(orderId);
      setCurrentOrder(order);
      return order;
    } catch (err) {
      console.error(`Failed to fetch order ${orderId}:`, err);
      setError(err.response?.data?.message || 'Failed to fetch order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's orders
  const fetchUserOrders = useCallback(async () => {
    // Handle nested user object structure
    const userId = user?.user?._id || user?._id;

    if (!userId) {
      console.log('No user ID available, cannot fetch orders');
      return [];
    }

    console.log(`Fetching orders for user: ${userId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getUserOrders(userId);
      console.log('Orders fetched from service:', response);

      // Extract the orders array from the response
      let ordersArray = [];
      if (response?.success && Array.isArray(response.data)) {
        ordersArray = response.data;
      } else if (Array.isArray(response)) {
        // Fallback for different response structure
        ordersArray = response;
      }

      console.log('Extracted orders:', ordersArray);
      setOrders(ordersArray);
      return ordersArray;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch orders';
      console.error('Failed to fetch user orders:', err);
      setError(errorMsg);
      toast.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch vendor's orders
  const fetchVendorOrders = useCallback(async (vendorId) => {
    if (!vendorId) {
      console.log('No vendor ID provided, cannot fetch vendor orders');
      return [];
    }

    console.log(`Fetching orders for vendor: ${vendorId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await orderService.getVendorOrders(vendorId);
      console.log('Vendor orders fetched from service:', response);

      // Extract the orders array from the response
      let ordersArray = [];
      if (response?.success && Array.isArray(response.data)) {
        ordersArray = response.data;
      } else if (Array.isArray(response)) {
        // Fallback for different response structure
        ordersArray = response;
      }

      console.log('Extracted vendor orders:', ordersArray);
      setOrders(ordersArray);
      return ordersArray;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || 'Failed to fetch vendor orders';
      console.error('Failed to fetch vendor orders:', err);
      setError(errorMsg);
      toast.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear current order
  const clearCurrentOrder = useCallback(() => {
    setCurrentOrder(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial data loading
  useEffect(() => {
    const userId = user?.user?._id || user?._id;
    const isVendor = user?.role === 'vendor' || user?.user?.role === 'vendor';

    if (isVendor) {
      console.log('Vendor detected, fetching vendor orders...', { userId });
      fetchVendorOrders(userId);
    } else if (userId) {
      console.log('User ID available, fetching user orders...', { userId });
      fetchUserOrders();
    } else if (user === null || (user && !userId)) {
      console.log('No valid user ID found, clearing orders');
      setOrders([]);
    }
    // We don't include fetchUserOrders/fetchVendorOrders in deps to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user?._id, user?._id, user?.role, user?.user?.role]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        currentOrder,
        loading,
        error,
        createOrder,
        getOrderById,
        fetchUserOrders,
        fetchVendorOrders,
        clearCurrentOrder,
        clearError,
      }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

export default OrderContext;
