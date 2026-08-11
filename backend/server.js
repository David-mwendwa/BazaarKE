import path, { dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import 'express-async-errors';
import 'dotenv/config.js';
import mongoose from 'mongoose';

import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';

// Security middleware
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import fileUpload from 'express-fileupload';

// =====================
// GLOBAL ERROR HANDLERS
// =====================

// Handle uncaught exceptions (synchronous errors) i.e undefined value
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Initialize Express app
const app = express();

app.set('trust proxy', 1); // trust first proxy (Render)

// =====================
// GLOBAL MIDDLEWARE
// =====================

// Enable CORS
//
// The frontend is deployed to Netlify on a different origin from this API, so
// the allowlist is the only thing letting the browser talk to it at all. Unset
// vars are filtered out rather than left in the array as `undefined`, which
// would silently allow nothing once both are missing.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.PROD_FRONTEND_URL,
].filter(Boolean);

// Netlify gives every branch and PR deploy its own subdomain, and hardcoding
// them is impossible — this matches them off the production site's own host.
const netlifyPreviewPattern = (() => {
  const prod = process.env.PROD_FRONTEND_URL;
  if (!prod) return null;
  const match = /^https:\/\/([a-z0-9-]+)\.netlify\.app\/?$/i.exec(prod);
  return match
    ? new RegExp(`^https://[a-z0-9-]+--${match[1]}\\.netlify\\.app$`, 'i')
    : null;
})();

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl, or a server-to-server call such
      // as the M-Pesa callback. CORS doesn't apply, so don't block it.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (netlifyPreviewPattern?.test(origin)) return callback(null, true);

      // Deny by withholding the header, not by throwing. Throwing here hands
      // an error to the global handler, so every disallowed request answers
      // 500 — which reads as "the API is broken" rather than "this origin
      // isn't on the list", and is exactly the wrong signal when the cause is
      // an unset PROD_FRONTEND_URL. The browser blocks it either way.
      console.warn(
        `CORS: rejected origin ${origin}. Allowed: ${
          allowedOrigins.join(', ') || '(none — is PROD_FRONTEND_URL set?)'
        }`
      );
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// =====================
// SECURITY MIDDLEWARE
// =====================

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'trusted-cdn.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'api.yourservice.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    // Locally-stored product and avatar images are served from this API but
    // rendered by the frontend on a different origin (Netlify), so 'same-site'
    // would make every one of them a broken image in production.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: { maxAge: 15552000, includeSubDomains: true },
  })
);

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Clean any user input from XSS attacks
app.use(xss());

// Parse cookies
app.use(cookieParser());

// File upload middleware
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — product photos exceed 2MB
    abortOnLimit: true,
    responseOnLimit: 'File size too large. Max 5MB allowed.',
  })
);

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['page', 'limit', 'sort', 'fields', 'search', 'status'],
  })
);

// =====================
// LOGGING (Development only)
// =====================
if (/dev/i.test(process.env.NODE_ENV)) {
  app.use(morgan('dev'));
}

// =====================
// RATE LIMITING
// =====================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: 'Too many login attempts. Please try again later.',
  skip: (req) => req.path === '/health',
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.path.startsWith('/api/health'),
});

// app.use('/api', apiLimiter);
// app.use('/api/v1/auth', authLimiter);

// =====================
// ROUTES
// =====================

/**
 * Simple health check endpoint for uptime and environment monitoring.
 *
 * Returns a JSON payload with basic status information that can be used by
 * load balancers or monitoring tools.
 *
 * @route GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import questionRoutes from './routes/questionRoutes.js';

app.use('/api/v1', productRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
// Mounted on their own prefixes, ahead of nothing that shares them, so the
// per-route `authenticate` dance the generic '/api/v1' routers need doesn't
// apply here.
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/shipping', shippingRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1', questionRoutes);
app.use('/api/v1', uploadRoutes);

// Vendor-uploaded product images, when Cloudinary isn't configured. Served in
// every environment (unlike the frontend build below, which is production
// only) because the images are referenced by absolute URL from the database.
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public', 'uploads'), {
    maxAge: '30d',
    // These are user-supplied files: never let one be sniffed into something
    // executable, and don't hand the browser anything to render inline.
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

// =====================
// SERVE STATIC FILES (single-host production only)
// =====================
// Two production shapes are supported: one host serving both halves (the
// frontend build sits next to this folder), and a split deploy where Netlify
// serves the SPA and this process is only an API. Deciding on NODE_ENV alone
// assumed the first — on Render, where the service root is backend/ and no
// build ever lands, it meant every request for '/' tried to sendFile a path
// that cannot exist and logged an ENOENT as if something were broken.
const frontendDist = path.join(__dirname, '../frontend/dist');
const servesFrontend =
  /production/.test(process.env.NODE_ENV) &&
  existsSync(path.join(frontendDist, 'index.html'));

if (servesFrontend) {
  // Serve static files with 1-year cache for better performance
  app.use(
    express.static(frontendDist, {
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      },
    })
  );

  // Handle Single Page Application (SPA) routing
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'Not Found' });
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // API-only deploy. Answer the root path rather than letting it fall through
  // to the 404 handler: uptime probes and anyone who pastes the service URL
  // into a browser both land here, and a bare 404 gives neither of them a way
  // to tell "wrong URL" from "service broken".
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'BazaarKE API',
      status: 'ok',
      health: '/api/health',
      docs: 'https://github.com/David-mwendwa/BazaarKE#readme',
    });
  });
}

// =====================
// ERROR HANDLING
// =====================
import notFoundMiddleware from './middleware/notFound.js';
import errorHandlerMiddleware from './middleware/errorHandler.js';

// 404 handler (must be after routes)
app.use(notFoundMiddleware);

// Global error handler (must be last)
app.use(errorHandlerMiddleware);

// =====================
// DATABASE CONNECTION
// =====================
mongoose.set('strictQuery', false);

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in environment variables');
  process.exit(1);
}

const DB = process.env.MONGO_URI.replace(
  '<PASSWORD>',
  process.env.MONGO_PASSWORD || ''
);

const mongooseOptions = {
  serverSelectionTimeoutMS: 10000, // Wait up to 10s for server selection
  socketTimeoutMS: 30000, // Close idle connections after 30s
  maxPoolSize: 10, // Reasonable default for most apps
  w: 'majority', // Ensure write acknowledgement
};

mongoose
  .connect(DB, mongooseOptions)
  .then(() => console.log('✅ MongoDB connection successful'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// =====================
// SERVER SETUP
// =====================
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `🚀 Server running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${PORT}`
  );
  console.log(`📡 Connect: http://localhost:${PORT}`);
});

// =====================
// GLOBAL ERROR HANDLERS
// =====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error(err.stack); // Add stack trace for debugging
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error(err.stack); // Add stack trace for debugging
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM (for Heroku, etc.)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

// Handle process termination (Ctrl+C)
process.on('SIGINT', () => {
  console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

export default app;
