import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser,
  getAllUsers,
  approveAllUsers,
  approveUser,
  rejectUser,
  loginUserWithOtp,
  forgotPassword,
  sendResetLink,
  resetPassword,
  sendLoginOtp,
  verifyLoginOtp,
  resendOtp
} from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateMiddleware.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authValidator.js';

const router = express.Router();

// Routes Configuration
router.post('/register', validateRequest(registerSchema), registerUser);
router.post('/login', validateRequest(loginSchema), loginUser);
router.post('/otp-login', loginUserWithOtp);

// Forgot Password and OTP Authentication Routes
router.post('/forgot-password', forgotPassword);
router.post('/send-reset-link', sendResetLink);
router.post('/reset-password/:token', resetPassword);
router.post('/send-login-otp', sendLoginOtp);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/resend-otp', resendOtp);

router.get('/profile', authenticateUser, getUserProfile);
router.put('/profile', authenticateUser, validateRequest(updateProfileSchema), updateUserProfile);
router.post('/logout', authenticateUser, logoutUser);

// Admin user approval/rejection endpoints
router.get('/users', authenticateUser, authorizeRoles('Admin'), getAllUsers);
router.put('/users/approve-all', authenticateUser, authorizeRoles('Admin'), approveAllUsers);
router.put('/users/:id/approve', authenticateUser, authorizeRoles('Admin'), approveUser);
router.delete('/users/:id/reject', authenticateUser, authorizeRoles('Admin'), rejectUser);

export default router;
