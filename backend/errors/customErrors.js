import { StatusCodes } from 'http-status-codes';

/**
 * Base class for all custom API errors.
 *
 * Extends the native `Error` object with an HTTP `statusCode` property so that
 * the central error handler can map application errors to appropriate HTTP
 * responses.
 *
 * @extends Error
 * @property {number} statusCode - HTTP status code associated with the error.
 */
export class CustomAPIError extends Error {
  /**
   * Create a new CustomAPIError.
   *
   * @param {string} message - Human-readable error message.
   * @param {number} [statusCode=StatusCodes.INTERNAL_SERVER_ERROR] - HTTP
   *   status code to associate with this error.
   */
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// HTTP 4xx Client Errors

/**
 * 400 Bad Request Error.
 *
 * Typically used when the client sends malformed or invalid data.
 *
 * @extends CustomAPIError
 * @example
 * throw new BadRequestError('Invalid input provided');
 */
export class BadRequestError extends CustomAPIError {
  constructor(message = 'Bad Request') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

/**
 * 401 Unauthorized Error.
 *
 * Used when authentication is required but missing or invalid.
 *
 * @extends CustomAPIError
 */
export class UnauthenticatedError extends CustomAPIError {
  constructor(message = 'Authentication required') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

/**
 * 403 Forbidden Error.
 *
 * Used when the user is authenticated but does not have permission to perform
 * the requested action.
 *
 * @extends CustomAPIError
 */
export class ForbiddenError extends CustomAPIError {
  constructor(message = 'Forbidden') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

/**
 * 404 Not Found Error.
 *
 * Used when a requested resource cannot be found.
 *
 * @extends CustomAPIError
 */
export class NotFoundError extends CustomAPIError {
  constructor(message = 'Resource not found') {
    super(message, StatusCodes.NOT_FOUND);
  }
}

/**
 * 405 Method Not Allowed.
 *
 * Used when the HTTP method is not supported for the requested resource.
 *
 * @extends CustomAPIError
 */
export class MethodNotAllowedError extends CustomAPIError {
  constructor(message = 'Method not allowed') {
    super(message, StatusCodes.METHOD_NOT_ALLOWED);
  }
}

/**
 * 408 Request Timeout.
 *
 * Used when the server times out waiting for the client to send a request.
 *
 * @extends CustomAPIError
 */
export class RequestTimeoutError extends CustomAPIError {
  constructor(message = 'Request timeout') {
    super(message, StatusCodes.REQUEST_TIMEOUT);
  }
}

/**
 * 409 Conflict Error.
 *
 * Used when a request conflicts with the current state of the server, such as
 * creating a resource that already exists.
 *
 * @extends CustomAPIError
 */
export class ConflictError extends CustomAPIError {
  constructor(message = 'Resource already exists') {
    super(message, StatusCodes.CONFLICT);
  }
}

/**
 * 422 Unprocessable Entity Error.
 *
 * Used when the server understands the content type of the request entity but
 * was unable to process the contained instructions (e.g. validation errors).
 *
 * @extends CustomAPIError
 */
export class ValidationError extends CustomAPIError {
  /**
   * @param {string|Object} errors - Validation errors (string or object with error details)
   * @param {string} [message='Validation failed'] - Error message
   */
  constructor(errors, message = 'Validation failed') {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY);
    this.errors = typeof errors === 'string' ? { message: errors } : errors;
  }
}

/**
 * 429 Too Many Requests.
 *
 * Used for rate-limiting scenarios where the client has sent too many
 * requests in a given amount of time.
 *
 * @extends CustomAPIError
 */
export class TooManyRequestsError extends CustomAPIError {
  constructor(message = 'Too many requests, please try again later.') {
    super(message, StatusCodes.TOO_MANY_REQUESTS);
  }
}

// HTTP 5xx Server Errors

/**
 * 500 Internal Server Error.
 *
 * Generic server error used when an unexpected condition was encountered.
 *
 * @extends CustomAPIError
 */
export class InternalServerError extends CustomAPIError {
  constructor(message = 'Internal server error') {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 * 503 Service Unavailable.
 *
 * Used when the server is currently unable to handle the request due to
 * temporary overload or maintenance.
 *
 * @extends CustomAPIError
 */
export class ServiceUnavailableError extends CustomAPIError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, StatusCodes.SERVICE_UNAVAILABLE);
  }
}

// Business Logic Errors

/**
 * Business rule error thrown when an election is not active.
 *
 * Typically used to prevent voting actions on inactive elections.
 *
 * @extends CustomAPIError
 */
export class ElectionNotActiveError extends CustomAPIError {
  constructor(message = 'This election is not currently active') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

/**
 * Business rule error thrown when a user has already voted in an election.
 *
 * @extends CustomAPIError
 */
export class AlreadyVotedError extends CustomAPIError {
  constructor(message = 'You have already voted in this election') {
    super(message, StatusCodes.CONFLICT);
  }
}

/**
 * Business rule error thrown when a submitted vote is invalid.
 *
 * @extends CustomAPIError
 */
export class InvalidVoteError extends CustomAPIError {
  constructor(message = 'Invalid vote') {
    super(message, StatusCodes.BAD_REQUEST);
  }
}

// class ErrorHandler extends Error {
//   constructor(message, statusCode) {
//     super(message);
//     this.statusCode = statusCode;

//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// export default ErrorHandler;
