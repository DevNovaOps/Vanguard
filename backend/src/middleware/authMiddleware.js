import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';

/**
 * Route protection middleware.
 * Verifies JWT signature and checks if the token belongs to an active user.
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from Bearer <token>
      token = req.headers.authorization.split(' ')[1];

      // Decode token payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user profile
      const user = await userRepository.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account has been deactivated'
        });
      }

      // Assign user profile to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('[AUTH-MIDDLEWARE] Token Verification Failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Access denied, token verification failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied, no authorization token provided'
    });
  }
};

// Alias for standard naming conventions
export const authenticateUser = protect;
