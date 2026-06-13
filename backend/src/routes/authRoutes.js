import express from 'express';
import { body } from 'express-validator';
import {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser,
  getAllUsers,
  approveAllUsers,
  approveUser,
  rejectUser,
  loginUserWithOtp
} from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Register Validation Schema
const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .trim()
    .isIn(['Admin', 'Operator', 'SafetyOfficer', 'Manager'])
    .withMessage('Role must be one of: Admin, Operator, SafetyOfficer, Manager'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array of strings')
];

// Login Validation Schema
const loginValidationRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes Configuration
router.post('/register', registerValidationRules, registerUser);
router.post('/login', loginValidationRules, loginUser);
router.post('/otp-login', loginUserWithOtp);
router.get('/profile', authenticateUser, getUserProfile);
router.post('/logout', authenticateUser, logoutUser);

// Admin user approval/rejection endpoints
router.get('/users', authenticateUser, authorizeRoles('Admin'), getAllUsers);
router.put('/users/approve-all', authenticateUser, authorizeRoles('Admin'), approveAllUsers);
router.put('/users/:id/approve', authenticateUser, authorizeRoles('Admin'), approveUser);
router.delete('/users/:id/reject', authenticateUser, authorizeRoles('Admin'), rejectUser);

export default router;
