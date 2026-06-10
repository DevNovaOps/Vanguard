import { validationResult } from 'express-validator';
import complianceService from '../services/complianceService.js';

/**
 * @desc    Get all compliance rules
 * @route   GET /api/compliance/rules
 * @access  Private (Admin, SafetyOfficer)
 */
export const getRules = async (req, res, next) => {
  try {
    const { page, limit, search, sensorType, severity, isActive, standard, sortBy, sortOrder } = req.query;
    const result = await complianceService.getRules({
      page,
      limit,
      search,
      sensorType,
      severity,
      isActive,
      standard,
      sortBy,
      sortOrder
    });

    res.status(200).json({
      success: true,
      count: result.rules.length,
      pagination: result.pagination,
      rules: result.rules
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed view of a single compliance rule by ID
 * @route   GET /api/compliance/rules/:id
 * @access  Private (Admin, SafetyOfficer)
 */
export const getRuleById = async (req, res, next) => {
  try {
    const rule = await complianceService.getRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Compliance Rule not found'
      });
    }

    res.status(200).json({
      success: true,
      rule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new compliance rule
 * @route   POST /api/compliance/rules
 * @access  Private/Admin (Admin only)
 */
export const createRule = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const rule = await complianceService.createRule(req.body, req);
    res.status(201).json({
      success: true,
      message: 'Compliance Rule created successfully',
      rule
    });
  } catch (error) {
    // If our service throws custom error with statusCode
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Update a compliance rule by ID
 * @route   PUT /api/compliance/rules/:id
 * @access  Private/Admin (Admin only)
 */
export const updateRule = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const rule = await complianceService.updateRule(req.params.id, req.body, req);
    res.status(200).json({
      success: true,
      message: 'Compliance Rule updated successfully',
      rule
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Soft-delete a compliance rule by ID
 * @route   DELETE /api/compliance/rules/:id
 * @access  Private/Admin (Admin only)
 */
export const deleteRule = async (req, res, next) => {
  try {
    await complianceService.softDeleteRule(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Compliance Rule soft-deleted successfully (marked inactive)'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Get all compliance violations
 * @route   GET /api/compliance/violations
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const getViolations = async (req, res, next) => {
  try {
    const { page, limit, status, severity, sensorType, nodeId, ruleId, sortBy, sortOrder } = req.query;
    const result = await complianceService.getViolations({
      page,
      limit,
      status,
      severity,
      sensorType,
      nodeId,
      ruleId,
      sortBy,
      sortOrder
    });

    res.status(200).json({
      success: true,
      count: result.violations.length,
      pagination: result.pagination,
      violations: result.violations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a single compliance violation
 * @route   GET /api/compliance/violations/:id
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const getViolationById = async (req, res, next) => {
  try {
    const violation = await complianceService.getViolationById(req.params.id);
    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Compliance Violation not found'
      });
    }

    res.status(200).json({
      success: true,
      violation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get compliance dashboard statistics
 * @route   GET /api/compliance/dashboard
 * @access  Private (Admin, SafetyOfficer, Manager)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await complianceService.getDashboardStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};
