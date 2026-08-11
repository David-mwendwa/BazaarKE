import { StatusCodes } from 'http-status-codes';

/**
 * Express middleware that handles unmatched routes with a 404 JSON response.
 *
 * Should be registered after all other route handlers so that any request
 * which does not match an existing route will fall through to this handler.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 * @returns {void}
 *
 * @example
 * Example: register as the final middleware in your Express app
 * app.use(notFoundMiddleware);
 */
const notFoundMiddleware = (_, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Route not found',
  });
};

export default notFoundMiddleware;
