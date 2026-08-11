import axios from 'axios';
import { StatusCodes } from 'http-status-codes';

// Cache for the access token
let mpesaAccessToken = null;
let tokenExpiration = 0;

// Get M-Pesa OAuth token
const getMpesaToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    // Set token with 50-minute expiry (MPesa tokens expire after 1 hour)
    mpesaAccessToken = response.data.access_token;
    tokenExpiration = Date.now() + 50 * 60 * 1000; // 50 minutes from now

    return mpesaAccessToken;
  } catch (error) {
    console.error('M-Pesa token error:', error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

// Middleware to add M-Pesa token to request
const mpesaAuth = async (req, res, next) => {
  try {
    // For callback URL (from M-Pesa), validate the request
    if (req.originalUrl.includes('/mpesa/callback')) {
      // Validate the callback signature if needed
      // This is a simplified version - you might want to add more validation
      const callbackValid = true; // Add your validation logic here

      if (!callbackValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid callback signature',
        });
      }
      return next();
    }

    // For API requests, add M-Pesa token
    if (!mpesaAccessToken || Date.now() >= tokenExpiration) {
      await getMpesaToken();
    }

    req.mpesaAccessToken = mpesaAccessToken;
    next();
  } catch (error) {
    console.error('M-Pesa auth error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'M-Pesa authentication failed',
    });
  }
};

export default mpesaAuth;
