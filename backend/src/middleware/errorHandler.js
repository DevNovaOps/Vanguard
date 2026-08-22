import AppError from '../errors/AppError.js';

/**
 * Centralized error handler middleware.
 * Handles AppError instances and generic errors.
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with this value already exists';
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  // MySQL data too long
  if (err.code === 'ER_DATA_TOO_LONG') {
    statusCode = 400;
    message = 'Input value exceeds maximum allowed length';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Joi validation errors
  if (err.isJoi) {
    statusCode = 400;
    message = err.details ? err.details.map(d => d.message).join(', ') : err.message;
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error(`[ERROR-HANDLER] ${statusCode} — ${message}`);
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
