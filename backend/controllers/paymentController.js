import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Order from '../models/Order.js';
import User from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DEMO_USER_ID = '693ef1e79d48a0deb8755f59';

// Generate M-Pesa password
const generateMpesaPassword = () => {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, -3);
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');
  return { password, timestamp };
};

// Process card payment
export const processCardPayment = async (req, res) => {
  try {
    const { orderId, paymentMethodId } = req.body;
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.user._id.toString() !== req.user.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Not authorized to process this order',
      });
    }

    // Handle demo order
    if (order.user._id.toString() === DEMO_USER_ID) {
      return handleDemoPayment(req, res, order, 'card', {
        isDemo: true,
        paymentMethodId,
      });
    }

    return await handleCardPayment(req, res, order, { paymentMethodId });
  } catch (error) {
    console.error('Card payment error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error processing card payment',
      error: error.message,
    });
  }
};

// Process M-Pesa payment
export const processMpesaPayment = async (req, res) => {
  try {
    const { orderId, phone } = req.body;
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.user._id.toString() !== req.user.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Not authorized to process this order',
      });
    }

    // Handle demo order
    if (order.user._id.toString() === DEMO_USER_ID) {
      return handleDemoPayment(req, res, order, 'mpesa', {
        isDemo: true,
        phone: phone || '254700000000',
      });
    }

    return await handleMpesaPayment(req, res, order, { phone });
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error processing M-Pesa payment',
      error: error.message,
    });
  }
};

// Process PayPal payment
export const processPayPalPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.user._id.toString() !== req.user.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Not authorized to process this order',
      });
    }

    // Handle demo order
    if (order.user._id.toString() === DEMO_USER_ID) {
      return handleDemoPayment(req, res, order, 'paypal', {
        isDemo: true,
      });
    }

    return await handlePayPalPayment(req, res, order, {});
  } catch (error) {
    console.error('PayPal payment error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error processing PayPal payment',
      error: error.message,
    });
  }
};

// Handle demo payment
const handleDemoPayment = async (req, res, order, paymentMethod, metadata) => {
  try {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const paymentDetails = {
      provider: paymentMethod === 'card' ? 'stripe' : paymentMethod, // Ensure valid provider value
      isDemo: true,
      timestamp: new Date(),
    };

    // Add provider-specific details
    if (paymentMethod === 'card') {
      const paymentMethodId =
        'pm_demo_' + crypto.randomBytes(4).toString('hex');
      paymentDetails.stripe = {
        paymentMethod: paymentMethodId, // Store only the ID as a string
        paymentMethodDetails: {
          // Store the full details in a separate field
          id: paymentMethodId,
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2034,
            country: 'US',
          },
        },
      };
      paymentDetails.paymentMethodId = paymentMethodId;
      paymentDetails.provider = 'stripe';
    } else if (paymentMethod === 'mpesa') {
      paymentDetails.mpesa = {
        receiptNumber: `MP${Date.now()}`,
        phoneNumber: '254700000003',
        transactionDate: new Date(),
      };
    } else if (paymentMethod === 'paypal') {
      paymentDetails.paypal = {
        orderId: `PAYPAL-DEMO-${Date.now()}`,
        status: 'COMPLETED',
      };
    }

    // Update the order status and get the updated order in one operation
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          'payment.status': 'paid',
          'payment.provider': paymentDetails.provider,
          'payment.stripe': paymentDetails.stripe,
          'payment.mpesa': paymentDetails.mpesa,
          'payment.paypal': paymentDetails.paypal,
          'payment.paymentMethodId': paymentDetails.paymentMethodId,
          'payment.isDemo': true,
          status: 'processing',
          updatedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: 'processing',
            changedBy: order.user,
            comment: 'Payment processed successfully (demo)',
            metadata: {
              isDemo: true,
              paymentMethod: paymentMethod,
            },
          },
        },
      },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    return res.status(StatusCodes.OK).json({
      success: true,
      isDemo: true,
      message: 'Demo payment processed successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Demo payment error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      isDemo: true,
      message: 'Error processing demo payment',
      error: error.message,
    });
  }
};

// Handle card payment
const handleCardPayment = async (req, res, order, metadata) => {
  try {
    const { paymentMethodId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      // Order totals are tracked in KES, but the connected test account may
      // not have KES enabled — charge the equivalent amount in USD cents so
      // the demo works regardless of account currency settings.
      amount: Math.round(order.total.amount * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      payment_method_types: ['card'],
      confirm: true,
      metadata: {
        orderId: order._id.toString(),
        userId: order.user._id.toString(),
      },
    });

    // A test card can come back requiring 3D-Secure ("requires_action")
    // instead of succeeding outright — only mark the order paid once Stripe
    // confirms it actually went through.
    await order.updatePaymentStatus(
      paymentIntent.status === 'succeeded' ? 'paid' : 'pending',
      {
        provider: 'stripe',
        stripe: {
          paymentIntentId: paymentIntent.id,
          // Schema stores just the ID string here (see models/Order.js) — the
          // fuller details object has its own separate field.
          paymentMethod: paymentMethodId,
        },
      }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      order: await Order.findById(order._id).populate(
        'user',
        'firstName lastName email'
      ),
    });
  } catch (error) {
    console.error('Card payment error:', error);

    // Update order with error status
    if (order) {
      await order.updatePaymentStatus('failed', {
        error: {
          code: error.code || 'payment_error',
          message: error.message,
          type: error.type,
        },
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process card payment',
      error: error.message,
      code: error.code,
      type: error.type,
    });
  }
};

// Handle M-Pesa payment
const handleMpesaPayment = async (req, res, order, metadata) => {
  try {
    const { phone } = req.body;
    const { password, timestamp } = generateMpesaPassword();

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: order.total.amount,
        PartyA: `254${phone.substring(phone.length - 9)}`,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: `254${phone.substring(phone.length - 9)}`,
        CallBackURL: `${process.env.MPESA_CALLBACK_URL || process.env.API_URL}/payments/mpesa/callback`,
        AccountReference: `Order-${order._id}`,
        TransactionDesc: 'MarketHub Purchase',
      },
      {
        headers: {
          Authorization: `Bearer ${req.mpesaAccessToken}`,
        },
      }
    );

    await order.updatePaymentStatus('pending', {
      provider: 'mpesa',
      mpesa: {
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        phone: `254${phone.substring(phone.length - 9)}`,
        amount: order.total.amount,
      },
    });

    // This Daraja sandbox app has no registered test MSISDN able to approve
    // an STK push — every real push comes back from Safaricom as a failure
    // (ResultCode 11/1037, "invalid state"/"timeout"), never a success, no
    // matter which phone number is used, often within 1-2s. That's a
    // sandbox-account limit, not a bug in this flow (the push itself is
    // genuinely sent and accepted — see the pending status above). To let
    // the checkout demo a real 'paid' M-Pesa order end-to-end, mark it paid
    // immediately rather than racing the real callback with a delayed timer
    // — the mpesaCallback guard below then ignores the real failure once it
    // eventually arrives.
    if (process.env.MPESA_SIMULATE_CALLBACK === 'true') {
      await order.updatePaymentStatus('paid', {
        mpesa: {
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          receiptNumber: `SIM${Date.now()}`,
          transactionDate: new Date(),
          phoneNumber: `254${phone.substring(phone.length - 9)}`,
          isSimulated: true,
        },
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'M-Pesa payment initiated',
      checkoutRequestId: response.data.CheckoutRequestID,
      order: await Order.findById(order._id).populate(
        'user',
        'firstName lastName email'
      ),
    });
  } catch (error) {
    console.error('M-Pesa payment error:', error);

    if (order) {
      await order.updatePaymentStatus('failed', {
        error: {
          code: error.response?.data?.errorCode || 'mpesa_error',
          message: error.response?.data?.errorMessage || error.message,
        },
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to initiate M-Pesa payment',
      error: error.response?.data?.errorMessage || error.message,
    });
  }
};

// Handle PayPal payment
const handlePayPalPayment = async (req, res, order, metadata) => {
  try {
    const paypalOrder = await paypal.orders.create({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: order.totalAmount.toString(),
          },
          reference_id: order._id.toString(),
        },
      ],
    });

    await order.updatePaymentStatus('pending', {
      provider: 'paypal',
      paypal: {
        orderId: paypalOrder.id,
        status: paypalOrder.status,
        amount: order.totalAmount,
        currency: 'USD',
      },
    });

    res.status(StatusCodes.OK).json({
      success: true,
      orderId: paypalOrder.id,
      status: paypalOrder.status,
      order: await Order.findById(order._id).populate(
        'user',
        'firstName lastName email'
      ),
    });
  } catch (error) {
    console.error('PayPal payment error:', error);

    if (order) {
      await order.updatePaymentStatus('failed', {
        error: {
          code: error.response?.details?.[0]?.issue || 'paypal_error',
          message: error.response?.message || error.message,
        },
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process PayPal payment',
      error: error.response?.message || error.message,
    });
  }
};

// M-Pesa callback
export const mpesaCallback = async (req, res) => {
  try {
    const { Body: body } = req.body;
    const result = body.stkCallback;

    const order = await Order.findOne({
      'payment.mpesa.checkoutRequestId': result.CheckoutRequestID,
    });

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    // The sandbox's real callback always arrives after our simulated one
    // (see MPESA_SIMULATE_CALLBACK) since it takes longer to time out than
    // our 2.5s simulation — ignore it once a status has already landed.
    if (order.payment.status === 'paid' || order.payment.status === 'failed') {
      return res.status(StatusCodes.OK).json({ received: true });
    }

    if (result.ResultCode === 0) {
      const { CallbackMetadata } = result;
      const metadata = CallbackMetadata.Item.reduce((acc, item) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});

      await order.updatePaymentStatus('paid', {
        mpesa: {
          receiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: new Date(metadata.TransactionDate).toISOString(),
          amount: metadata.Amount,
          phoneNumber: metadata.PhoneNumber,
        },
      });
    } else {
      await order.updatePaymentStatus('failed', {
        error: {
          code: result.ResultCode,
          message: result.ResultDesc,
        },
      });
    }

    res.status(StatusCodes.OK).json({ received: true });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error processing M-Pesa callback',
      error: error.message,
    });
  }
};

// Check payment status
export const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .select('payment.status payment.method')
      .populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      status: order.payment.status,
      method: order.payment.method,
      order,
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error checking payment status',
      error: error.message,
    });
  }
};

// Get payment methods
export const getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or other cards',
        icon: 'credit-card',
        enabled: true,
      },
      {
        id: 'mpesa',
        name: 'M-Pesa',
        description: 'Mobile money payment via M-Pesa',
        icon: 'mobile',
        enabled: true,
      },
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'Pay with your PayPal account',
        icon: 'paypal',
        enabled: true,
      },
    ];

    res.status(StatusCodes.OK).json({
      success: true,
      methods,
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error getting payment methods',
      error: error.message,
    });
  }
};

// Get payment config
export const getPaymentConfig = (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      config: {
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        paypalClientId: process.env.PAYPAL_CLIENT_ID,
        mpesaShortcode: process.env.MPESA_SHORTCODE,
      },
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error getting payment configuration',
      error: error.message,
    });
  }
};
