import jwt from 'jsonwebtoken';
import { UnauthenticatedError, ForbiddenError } from '../errors/customErrors.js';

/**
 * Shape of the decoded JWT payload attached to `req.user` after authentication.
 *
 * @typedef {Object} AuthenticatedUser
 * @property {string} id - User identifier taken from the JWT payload.
 * @property {string} role - User role (e.g. `user`, `admin`, `sysadmin`).
 * @property {number} iat - Issued-at timestamp (seconds since epoch).
 * @property {number} exp - Expiry timestamp (seconds since epoch).
 */

/**
 * Authenticate incoming requests by validating a JWT token from common sources.
 *
 * The middleware looks for a token in the following order:
 * 1. `req.cookies.token`
 * 2. `req.signedCookies.token`
 * 3. `Authorization` header with a `Bearer` token
 * 4. Raw `cookie` header (fallback)
 *
 * When a valid token is found and verified, the decoded payload is attached to
 * `req.user` and the request is allowed to proceed. If no token is found or the
 * token is invalid/expired, an `UnauthenticatedError` is thrown.
 *
 * @async
 * @function authenticate
 * @param {import('express').Request & { user?: AuthenticatedUser }} req -
 *   Express request object; `req.user` is populated on success.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 * @throws {UnauthenticatedError} If no valid JWT is found or verification fails.
 * @returns {Promise<void>}
 *
 * @example
 * Example: protect a single route with authentication
 * router.get('/protected-route', authenticate, (req, res) => {
 *   const { id, role } = req.user; // decoded JWT payload
 *   res.json({ userId: id, role });
 * });
 */
export const authenticate = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  // Check for token in various locations
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.signedCookies?.token) {
    token = req.signedCookies.token;
  }

  if (!token) {
    throw new UnauthenticatedError('Authentication invalid. Please log in');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthenticatedError(
      'Invalid or expired token. Please log in again'
    );
  }
};

/**
 * Attach `req.user` when a valid token is present, and carry on when it isn't.
 *
 * For endpoints that are genuinely public but answer a little differently to
 * someone signed in — the category list, which hands an admin the inactive
 * rows; a product's questions, which mark the ones you asked. The alternative
 * is a second near-identical admin endpoint per resource, or making a public
 * page require a login it doesn't need.
 *
 * A *bad* token is treated as no token rather than an error: the caller didn't
 * ask for anything that requires one, and an expired session shouldn't turn
 * the storefront's category menu into a 401.
 *
 * @function optionalAuthenticate
 * @type {import('express').RequestHandler}
 */
export const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies?.token || req.signedCookies?.token || null;

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Ignored on purpose — see above.
    }
  }
  next();
};

/**
 * Factory for role-based authorization middleware.
 *
 * The returned middleware assumes that `authenticate` has already populated
 * `req.user`. It checks that `req.user.role` is included in the list of allowed
 * roles; otherwise a `ForbiddenError` is thrown.
 *
 * @function authorizeRoles
 * @param {...(string|string[])} roles - One or more roles or arrays of roles
 *   that are permitted to access the route.
 * @returns {import('express').RequestHandler} Express middleware that enforces
 *   role-based access control.
 * @throws {ForbiddenError} If the authenticated user's role is not allowed.
 *
 * @example
 * Example: only admins may access this route
 * router.get('/admin', authenticate, authorizeRoles('admin'), adminHandler);
 *
 * @example
 * Example: allow either admin or sysadmin roles
 * router.get(
 *   '/admin-or-sysadmin',
 *   authenticate,
 *   authorizeRoles('admin', 'sysadmin'),
 *   handler
 * );
 */
export const authorizeRoles = (...roles) => {
  // Flatten and normalize roles array to handle both formats
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `${req.user.role} is not authorized to perform this action`
      );
    }
    next();
  };
};
