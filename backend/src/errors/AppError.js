/**
 * Custom application error class for standardized error handling.
 * Supports HTTP status codes and operational vs programming error distinction.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request') {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(message, 409);
  }

  static locked(message = 'Resource is locked') {
    return new AppError(message, 423);
  }

  static internal(message = 'Internal Server Error') {
    return new AppError(message, 500);
  }
}

export default AppError;
