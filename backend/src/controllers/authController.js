import { validationResult } from 'express-validator';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import auditService from '../services/auditService.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  const { name, email, password, role, department, permissions } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      // Log failed registration attempt (e.g. duplicate email)
      await auditService.logEvent({
        req,
        action: 'LOGIN_FAILED', // Treat registration failure due to duplicate as warning
        module: 'Authentication',
        description: `Failed registration attempt for duplicate email: ${email}`,
        severity: 'Warning',
        metadata: { email }
      });
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists'
      });
    }

    // Create new user profile (schema hooks hash password auto)
    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      permissions
    });

    // Log user registered
    await auditService.logEvent({
      req,
      userId: user._id,
      username: user.name,
      role: user.role,
      action: 'USER_REGISTERED',
      module: 'Authentication',
      description: `New user registered: ${user.name} (${user.email}) as ${user.role}`,
      severity: 'Info',
      metadata: { userId: user._id, role: user.role, permissions: user.permissions }
    });

    res.status(201).json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        department: user.department,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  const { email, password } = req.body;

  try {
    // Find user profile
    const user = await User.findOne({ email });

    // Validate credentials
    if (!user || !(await user.comparePassword(password))) {
      await auditService.logLogin(req, user || { email }, false, 'Invalid credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Validate active status
    if (!user.isActive) {
      await auditService.logLogin(req, user, false, 'Account deactivated or pending approval');
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact your administrator.'
      });
    }

    // Log Login Success
    await auditService.logLogin(req, user, true);

    res.status(200).json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        department: user.department,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user profile details
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getUserProfile = async (req, res, next) => {
  try {
    // req.user has already been resolved and attached by protect middleware
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions,
        department: req.user.department,
        isActive: req.user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (Dummy handler for JWT clean-up on client side)
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = async (req, res, next) => {
  try {
    if (req.user) {
      await auditService.logLogout(req, req.user);
    } else {
      await auditService.logEvent({
        req,
        action: 'USER_LOGOUT',
        module: 'Authentication',
        description: 'User logged out (token cleared)',
        severity: 'Info'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out. Please remove authorization tokens client-side.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ email: { $ne: req.user.email } }).select('-password');
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve all pending user registrations (Admin only)
 * @route   PUT /api/auth/users/approve-all
 * @access  Private/Admin
 */
export const approveAllUsers = async (req, res, next) => {
  try {
    const result = await User.updateMany({ isActive: false }, { isActive: true });
    
    // Log approvals/role status
    await auditService.logEvent({
      req,
      action: 'ROLE_UPDATED',
      module: 'Authentication',
      description: `Approved all pending users access. Count: ${result.modifiedCount}`,
      severity: 'Info',
      metadata: { modifiedCount: result.modifiedCount }
    });

    res.status(200).json({
      success: true,
      message: `Successfully approved all pending users`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve user registration (Admin only)
 * @route   PUT /api/auth/users/:id/approve
 * @access  Private/Admin
 */
export const approveUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log approval/role update event
    await auditService.logEvent({
      req,
      userId: user._id,
      username: user.name,
      role: user.role,
      action: 'ROLE_UPDATED',
      module: 'Authentication',
      description: `User role/access approved: ${user.email} as ${user.role}`,
      severity: 'Info',
      metadata: { userId: user._id, role: user.role, permissions: user.permissions }
    });

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject and delete user registration (Admin only)
 * @route   DELETE /api/auth/users/:id/reject
 * @access  Private/Admin
 */
export const rejectUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log rejection event
    await auditService.logEvent({
      req,
      action: 'ROLE_UPDATED', // Role updated/removed
      module: 'Authentication',
      description: `User registration rejected and deleted: ${user.email}`,
      severity: 'Warning',
      metadata: { email: user.email, name: user.name, role: user.role }
    });

    res.status(200).json({
      success: true,
      message: 'User rejected and removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user via OTP & get token
 * @route   POST /api/auth/otp-login
 * @access  Public
 */
export const loginUserWithOtp = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user registered with this email address'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or is pending approval. Contact your administrator.'
      });
    }

    // Log Login Success
    await auditService.logLogin(req, user, true);

    res.status(200).json({
      success: true,
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        department: user.department,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};
