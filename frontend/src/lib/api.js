import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token and handle file uploads
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData - let the browser set it with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        // Don't redirect here, let the component handle it
        localStorage.removeItem('token');
        // Return a rejected promise with the error
        return Promise.reject(error);
      } else if (status === 403) {
        toast.error('You do not have permission to perform this action.');
      } else if (status === 404) {
        toast.error('The requested resource was not found.');
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (data && data.message) {
        // Don't show toast for 401 errors as they're handled by the components
        if (status !== 401) {
          toast.error(data.message);
        }
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      toast.error('Network error. Please check your connection and try again.');
    } else {
      // Something happened in setting up the request that triggered an Error
      toast.error('An error occurred. Please try again.');
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (email, password) =>
    api.post('/login', { email, password }).then((res) => res.data),
  register: (userData) =>
    api.post('/register', userData).then((res) => res.data),
  getMe: () => api.get('/me').then((res) => res.data),
  logout: () => api.get('/logout').then((res) => res.data),
  forgotPassword: (email) =>
    api.post('/password/forgot', { email }).then((res) => res.data),
  resetPassword: (token, newPassword) =>
    api
      .post(`/password/reset/${token}`, { newPassword })
      .then((res) => res.data),
  updatePassword: (currentPassword, newPassword) =>
    api
      .post('/password/update', { currentPassword, newPassword })
      .then((res) => res.data),
  updateProfile: (userData) =>
    api.post('/update/me', userData).then((res) => res.data),
  refreshToken: () => api.post('/refresh-token').then((res) => res.data),
};

// Products API endpoints
export const productsAPI = {
  getAll: (params = {}) =>
    api.get('/products', { params }).then((res) => res.data),
  getById: (id) => api.get(`/product/${id}`).then((res) => res.data),
  getByCategory: (categoryId, params = {}) =>
    api
      .get(`/products/category/${categoryId}`, { params })
      .then((res) => res.data),
  search: (query, params = {}) =>
    api
      .get('/products/search', { params: { q: query, ...params } })
      .then((res) => res.data),
  getFeatured: () => api.get('/products/featured').then((res) => res.data),
  getRelated: (productId) =>
    api.get(`/products/${productId}/related`).then((res) => res.data),
  create: (productData) =>
    api.post('/products', productData).then((res) => res.data),
  update: (id, productData) =>
    api.put(`/products/${id}`, productData).then((res) => res.data),
  delete: (id) => api.delete(`/products/${id}`).then((res) => res.data),
};

// Categories API endpoints
export const categoriesAPI = {
  getAll: () => api.get('/categories').then((res) => res.data),
  getById: (id) => api.get(`/categories/${id}`).then((res) => res.data),
};

// Users API endpoints
export const usersAPI = {
  getProfile: () => api.get('/users/me').then((res) => res.data),
  updateProfile: (userData) =>
    api.put('/users/me', userData).then((res) => res.data),
  changePassword: (currentPassword, newPassword) =>
    api
      .post('/users/change-password', { currentPassword, newPassword })
      .then((res) => res.data),
};

// Payment API endpoints
export const paymentAPI = {
  // Get payment configuration
  getConfig() {
    return api.get('/payments/config');
  },

  // Get available payment methods
  getPaymentMethods() {
    return api.get('/payments/methods');
  },

  // Process card payment
  processCardPayment(orderId, paymentMethodId) {
    return api.post('/payments/card', {
      orderId,
      paymentMethodId,
    });
  },

  // Process M-Pesa payment
  processMpesaPayment(orderId, phone) {
    return api.post('/payments/mpesa', {
      orderId,
      phone,
    });
  },

  // Process PayPal payment
  processPayPalPayment(orderId) {
    return api.post('/payments/paypal', {
      orderId,
    });
  },

  // Check payment status
  checkStatus(orderId) {
    return api.get(`/payments/status/${orderId}`);
  },

  // Legacy methods (for backward compatibility - will be removed in future)
  initializePayment(orderId, paymentMethod, details = {}) {
    console.warn(
      'initializePayment is deprecated. Use specific payment method endpoints instead.'
    );
    return api.post(`/payments/${paymentMethod}`, {
      orderId,
      ...details,
    });
  },

  mpesa: {
    initiateSTK(phone, amount, orderId) {
      console.warn(
        'mpesa.initiateSTK is deprecated. Use paymentAPI.processMpesaPayment instead.'
      );
      return api.post('/payments/mpesa', {
        orderId,
        phone,
        amount,
      });
    },
    checkStatus(orderId) {
      return api.get(`/payments/status/${orderId}`);
    },
  },

  stripe: {
    createPaymentIntent(amount, orderId) {
      console.warn(
        'stripe.createPaymentIntent is deprecated. Use paymentAPI.processCardPayment instead.'
      );
      return api.post('/payments/card', {
        orderId,
        amount,
      });
    },
    confirmPayment(paymentMethodId, orderId) {
      return api.post('/payments/card', {
        orderId,
        paymentMethodId,
      });
    },
  },

  paypal: {
    createOrder(amount, orderId) {
      console.warn(
        'paypal.createOrder is deprecated. Use paymentAPI.processPayPalPayment instead.'
      );
      return api.post('/payments/paypal', {
        orderId,
      });
    },
    captureOrder(orderId) {
      return api.post(`/payments/paypal`, {
        orderId,
      });
    },
  },
};

// Order API endpoints
export const orderAPI = {
  // Create a new order
  createOrder: (orderData) => api.post('/orders', orderData),

  // Get order by ID
  getOrderById: (orderId) => api.get(`/orders/${orderId}`),

  // Get user's orders
  getUserOrders: (userId) => api.get(`/users/${userId}/orders`),

  // Get vendor's orders
  getVendorOrders: (vendorId) => api.get(`/orders/vendor/${vendorId}`),

  // Update order status
  updateOrderStatus: (orderId, status) =>
    api.patch(`/orders/${orderId}/status`, { status }),

  // Cancel an order
  cancelOrder: (orderId) => api.post(`/orders/${orderId}/cancel`),

  // Get order by tracking number
  getOrderByTrackingNumber: (trackingNumber) =>
    api.get(`/orders/tracking/${trackingNumber}`),
};

// Export the configured axios instance
export default api;
