import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { useOrder } from '../../../contexts/OrderContext';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import Invoice from '../../../components/Invoice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/Select';
import { ROUTES } from '../../../constants/routes';
import { ICONS } from '../../../constants/icons';
import * as LucideIcons from 'lucide-react';

// Create a mapping of icon names to their Lucide components
const Icon = ({ name, ...props }) => {
  const LucideIcon = LucideIcons[ICONS[name]] || LucideIcons['HelpCircle'];
  return <LucideIcon {...props} />;
};

// Status configuration (same as in Orders.jsx)
const statusConfig = {
  pending: {
    icon: <Icon name='CLOCK' className='h-4 w-4' />,
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-400',
    label: 'Pending',
  },
  processing: {
    icon: <Icon name='CLOCK' className='h-4 w-4' />,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-400',
    label: 'Processing',
  },
  shipped: {
    icon: <Icon name='TRUCK' className='h-4 w-4' />,
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-400',
    label: 'Shipped',
  },
  delivered: {
    icon: <Icon name='CHECK_CIRCLE' className='h-4 w-4' />,
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-400',
    label: 'Delivered',
  },
  refunded: {
    icon: <Icon name='PACKAGE_X' className='h-4 w-4' />,
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-800 dark:text-gray-400',
    label: 'Refunded',
  },
  cancelled: {
    icon: <Icon name='X' className='h-4 w-4' />,
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-400',
    label: 'Cancelled',
  },
};

const ViewOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrderById } = useOrder();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const invoiceRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    pageStyle: `
      @page {
        size: A4;
        margin: 0.5cm;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        #invoice-print, #invoice-print * {
          visibility: visible;
        }
        #invoice-print {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `,
  });

  const handlePrintClick = () => {
    handlePrint();
  };

  const [formData, setFormData] = useState({
    status: '',
    trackingNumber: '',
    shippingMethod: '',
    customerNotes: '',
    adminNotes: '',
  });

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const response = await getOrderById(orderId);
        const orderData = response?.data ?? response;
        setOrder(orderData);
        setFormData({
          status: orderData.status || '',
          trackingNumber: orderData.shipping?.trackingNumber || '',
          shippingMethod: orderData.shipping?.method || 'standard',
          customerNotes: orderData.notes?.[0]?.content || orderData.notes?.[0]?.text || '',
          adminNotes: orderData.adminNotes || '',
        });
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error(error.response?.data?.message || 'Failed to load order');
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, getOrderById]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // In a real app, update order via API
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update local state
      setOrder((prev) => ({
        ...prev,
        ...formData,
        status: formData.status,
        trackingNumber: formData.trackingNumber,
        shippingMethod: formData.shippingMethod,
        notes: formData.customerNotes,
        adminNotes: formData.adminNotes,
      }));

      // Exit edit mode
      setIsEditing(false);

      // Show success message
      console.log('Order updated successfully');
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      status: order.status,
      trackingNumber: order.trackingNumber || '',
      shippingMethod: order.shippingMethod || 'standard',
      customerNotes: order.notes || '',
      adminNotes: order.adminNotes || '',
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className='text-center py-12'>
        <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
          Order not found
        </h2>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          The order you're looking for doesn't exist.
        </p>
        <Button
          className='mt-4'
          onClick={() => navigate(ROUTES.DASHBOARD.VENDOR_ORDERS)}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[formData.status] || statusConfig.processing;

  return (
    <div className='space-y-6'>
      {/* Hidden invoice for printing */}
      <div style={{ display: 'none' }}>
        <div id='invoice-print' className='print:block'>
          {order && (
            <Invoice
              order={order}
              statusConfig={statusConfig}
              ref={invoiceRef}
            />
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold'>
              Order #{order.orderNumber || order._id}
            </h2>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Placed on{' '}
              {new Date(
                order.createdAt || order.date || Date.now()
              ).toLocaleDateString()}
            </p>
          </div>
          <div className='flex items-center space-x-4'>
            {!isEditing && (
              <Button
                type='button'
                variant='outline'
                onClick={handlePrintClick}>
                <Icon name='PRINTER' className='mr-2 h-4 w-4' />
                Print Invoice
              </Button>
            )}
            {!isEditing ? (
              <Button type='button' onClick={() => setIsEditing(true)}>
                <Icon name='EDIT' className='mr-2 h-4 w-4' />
                Edit Order
              </Button>
            ) : (
              <div className='flex space-x-2'>
                <Button type='button' variant='outline' onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type='submit'>Save Changes</Button>
              </div>
            )}
            <Button asChild variant='ghost'>
              <Link to={ROUTES.DASHBOARD.VENDOR_ORDERS}>
                Back to Orders
              </Link>
            </Button>
          </div>
        </div>

        <div className='grid gap-6 md:grid-cols-3'>
          {/* Order Summary */}
          <div className='space-y-6'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h3 className='font-medium mb-4'>Order Status</h3>
              {isEditing ? (
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select status' />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(
                          ([key, { label }]) => (
                            <SelectItem key={key} value={key}>
                              <div className='flex items-center'>
                                <span
                                  className={`${statusConfig[key].text} mr-2`}>
                                  {statusConfig[key].icon}
                                </span>
                                {label}
                              </div>
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Tracking Number
                    </label>
                    <Input
                      type='text'
                      name='trackingNumber'
                      value={formData.trackingNumber}
                      onChange={handleInputChange}
                      placeholder='Enter tracking number'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Shipping Method
                    </label>
                    <Select
                      value={formData.shippingMethod}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          shippingMethod: value,
                        }))
                      }>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select shipping method' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='standard'>
                          Standard Shipping
                        </SelectItem>
                        <SelectItem value='express'>
                          Express Shipping
                        </SelectItem>
                        <SelectItem value='overnight'>Overnight</SelectItem>
                        <SelectItem value='pickup'>Store Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center'>
                      <div
                        className={`p-2 rounded-full ${statusInfo.bg} ${statusInfo.text} mr-3`}>
                        {statusInfo.icon}
                      </div>
                      <span className='font-medium'>{statusInfo.label}</span>
                    </div>
                    {formData.trackingNumber && (
                      <div className='text-sm text-gray-500 dark:text-gray-400'>
                        Tracking: {formData.trackingNumber}
                      </div>
                    )}
                  </div>
                  {formData.shippingMethod && (
                    <div className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
                      Shipping:{' '}
                      {formData.shippingMethod.replace(/^\w/, (c) =>
                        c.toUpperCase(),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h3 className='font-medium mb-4'>Customer</h3>
              <div className='space-y-2'>
                <p className='font-medium'>
                  {order.user?.name ||
                    order.customer?.name ||
                    order.user?.email ||
                    'N/A'}
                </p>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  {order.user?.email || order.customer?.email || 'N/A'}
                </p>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  {order.shippingAddress?.phone ||
                    order.customer?.phone ||
                    'N/A'}
                </p>
                {isEditing && (
                  <div className='mt-4'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Customer Notes
                    </label>
                    <Textarea
                      name='customerNotes'
                      value={formData.customerNotes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder='Add notes for the customer'
                    />
                  </div>
                )}
              </div>
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h3 className='font-medium mb-4'>Shipping Address</h3>
              <address className='not-italic text-sm text-gray-600 dark:text-gray-300 space-y-1'>
                {(order.shippingAddress?.firstName ||
                  order.shippingAddress?.lastName ||
                  order.shippingAddress?.name) && (
                  <p>
                    {[
                      order.shippingAddress?.firstName,
                      order.shippingAddress?.lastName,
                    ]
                      .filter(Boolean)
                      .join(' ') ||
                      order.shippingAddress?.name}
                  </p>
                )}
                {(order.shippingAddress?.address1 ||
                  order.shippingAddress?.street) && (
                  <p>
                    {order.shippingAddress?.address1 ||
                      order.shippingAddress?.street}
                    {order.shippingAddress?.address2 && `, ${order.shippingAddress.address2}`}
                  </p>
                )}
                <p>
                  {order.shippingAddress?.city}
                  {order.shippingAddress?.state && `, ${order.shippingAddress.state}`}
                  {order.shippingAddress?.postalCode &&
                    ` ${order.shippingAddress.postalCode}`}
                </p>
                <p>{order.shippingAddress?.country || 'Kenya'}</p>
                {order.shippingAddress?.phone && (
                  <p>{order.shippingAddress.phone}</p>
                )}
              </address>
              {isEditing && (
                <div className='mt-4'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Internal Notes
                  </label>
                  <Textarea
                    name='adminNotes'
                    value={formData.adminNotes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder='Add internal notes (not visible to customer)'
                  />
                </div>
              )}
            </div>

            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h3 className='font-medium mb-4'>Payment</h3>
              <div className='space-y-2'>
                <p className='text-sm text-gray-600 dark:text-gray-300 capitalize'>
                  {order.payment?.method || order.paymentMethod || 'N/A'}
                </p>
                <div className='flex items-center'>
                  <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 capitalize'>
                    {order.payment?.status || order.paymentStatus || order.isPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
                {isEditing && (
                  <div className='mt-4'>
                    <Button variant='outline' size='sm'>
                      <Icon name='REFRESH_CCW' className='mr-2 h-4 w-4' />
                      Update Payment Status
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className='md:col-span-2 space-y-6'>
            {isEditing && (
              <div className='bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded'>
                <div className='flex'>
                  <div className='flex-shrink-0'>
                    <Icon name='INFO' className='h-5 w-5 text-blue-400' />
                  </div>
                  <div className='ml-3'>
                    <p className='text-sm text-blue-700 dark:text-blue-300'>
                      You are in edit mode. Make your changes and click "Save
                      Changes" to update the order.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
                <h3 className='font-medium'>Order Items</h3>
              </div>
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {(order.items || []).map((item, idx) => {
                  const priceAmount =
                    item.price?.amount ?? item.price ?? 0;
                  const itemTotal =
                    (typeof priceAmount === 'number' ? priceAmount : 0) *
                    (item.quantity || 1);
                  return (
                    <div
                      key={item._id || item.product?._id || idx}
                      className='p-6 flex justify-between'>
                      <div className='flex'>
                        <div className='relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700'>
                          {(() => {
                            const thumbUrl =
                              item.thumbnail ||
                              item.product?.thumbnail ||
                              (typeof item.product?.images?.[0] === 'string'
                                ? item.product.images[0]
                                : item.product?.images?.[0]?.url);
                            return thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={item.name || item.product?.name || 'Product'}
                                className='absolute inset-0 h-full w-full object-cover'
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : null;
                          })()}
                          <div className='flex h-full w-full items-center justify-center'>
                            <Icon
                              name='PACKAGE'
                              className='h-8 w-8 text-gray-400'
                            />
                          </div>
                        </div>
                        <div className='ml-4'>
                          <h4 className='font-medium'>
                            {item.name || item.product?.name || 'Product'}
                          </h4>
                          <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                            Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className='font-medium'>
                        {formatCurrency(
                          itemTotal > 1000 && itemTotal % 100 === 0
                            ? itemTotal / 100
                            : itemTotal
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className='border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-4'>
                <div className='flex justify-between text-sm'>
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(
                      (order.subtotal?.amount ?? order.subtotal ?? 0) > 1000 &&
                        (order.subtotal?.amount ?? order.subtotal ?? 0) % 100 === 0
                        ? (order.subtotal?.amount ?? order.subtotal ?? 0) / 100
                        : order.subtotal?.amount ?? order.subtotal ?? 0
                    )}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Shipping</span>
                  <span>
                    {formatCurrency(
                      (order.shipping?.amount ?? order.shipping ?? 0) > 1000 &&
                        (order.shipping?.amount ?? order.shipping ?? 0) % 100 === 0
                        ? (order.shipping?.amount ?? order.shipping ?? 0) / 100
                        : order.shipping?.amount ?? order.shipping ?? 0
                    )}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Tax</span>
                  <span>
                    {formatCurrency(
                      (order.tax?.amount ?? order.tax ?? 0) > 1000 &&
                        (order.tax?.amount ?? order.tax ?? 0) % 100 === 0
                        ? (order.tax?.amount ?? order.tax ?? 0) / 100
                        : order.tax?.amount ?? order.tax ?? 0
                    )}
                  </span>
                </div>
                <div className='flex justify-between font-medium border-t border-gray-200 dark:border-gray-700 pt-4 mt-2'>
                  <span>Total</span>
                  <span>
                    {formatCurrency(
                      (order.total?.amount ?? order.total ?? 0) > 1000 &&
                        (order.total?.amount ?? order.total ?? 0) % 100 === 0
                        ? (order.total?.amount ?? order.total ?? 0) / 100
                        : order.total?.amount ?? order.total ?? 0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {(order.notes?.length > 0 ||
              (typeof order.notes === 'string' && order.notes)) && (
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h3 className='font-medium mb-2'>Order Notes</h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                {Array.isArray(order.notes)
                  ? order.notes
                      .map((n) => n?.content ?? n?.text ?? (typeof n === 'string' ? n : ''))
                      .filter(Boolean)
                      .join('; ')
                  : typeof order.notes === 'string'
                    ? order.notes
                    : ''}
              </p>
            </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ViewOrder;
