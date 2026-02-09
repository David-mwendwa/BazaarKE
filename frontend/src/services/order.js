import { orderAPI } from '@/lib/api';

const orderService = {
  // Create a new order
  async createOrder(orderData) {
    try {
      const response = await orderAPI.createOrder(orderData);
      return response.data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  },

  // Get order by ID
  async getOrderById(orderId) {
    try {
      const response = await orderAPI.getOrderById(orderId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch order:', error);
      throw error;
    }
  },

  // Get user's orders
  async getUserOrders(userId) {
    try {
      const response = await orderAPI.getUserOrders(userId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
      throw error;
    }
  },

  // Get vendor's orders
  async getVendorOrders(vendorId) {
    try {
      const response = await orderAPI.getVendorOrders(vendorId);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vendor orders:', error);
      throw error;
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const response = await orderAPI.updateOrderStatus(orderId, status);
      return response.data;
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  },

  // Cancel an order
  async cancelOrder(orderId) {
    try {
      const response = await orderAPI.cancelOrder(orderId);
      return response.data;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  },

  // Get order by tracking number
  async getOrderByTrackingNumber(trackingNumber) {
    try {
      const response = await orderAPI.getOrderByTrackingNumber(trackingNumber);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch order by tracking number:', error);
      throw error;
    }
  },
};

export default orderService;
