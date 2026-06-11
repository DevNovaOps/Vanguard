import mitigationService from '../services/mitigationService.js';
import { validationResult } from 'express-validator';

/**
 * @desc    Get all mitigations with optional filters
 * @route   GET /api/mitigations
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const getAllMitigations = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      severity: req.query.severity,
      nodeId: req.query.nodeId,
      executionSource: req.query.executionSource,
      action: req.query.action,
      type: req.query.type,
      incidentId: req.query.incidentId,
      search: req.query.search
    };

    const mitigations = await mitigationService.getAllMitigations(filters);

    res.status(200).json({
      success: true,
      message: 'Mitigation actions fetched successfully',
      count: mitigations.length,
      data: mitigations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed view of a single mitigation
 * @route   GET /api/mitigations/:id
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const getMitigationById = async (req, res, next) => {
  try {
    const mitigation = await mitigationService.getMitigationById(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Mitigation action details fetched successfully',
      data: mitigation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new manual mitigation action
 * @route   POST /api/mitigations
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const createMitigation = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    // Map executionSource based on the creator's user role
    let executionSource = 'OPERATOR';
    if (req.user.role === 'Admin') executionSource = 'ADMIN';
    else if (req.user.role === 'SafetyOfficer') executionSource = 'SAFETY_OFFICER';

    const mitigationData = {
      ...req.body,
      executionSource,
      executedBy: req.user._id // Assign creator as initial handler
    };

    const mitigation = await mitigationService.createMitigation(mitigationData, req);

    res.status(201).json({
      success: true,
      message: 'Mitigation action created successfully',
      data: mitigation
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    next(error);
  }
};

/**
 * @desc    Update mitigation status
 * @route   PATCH /api/mitigations/:id/status
 * @access  Private (Admin, SafetyOfficer)
 */
export const updateMitigationStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const mitigation = await mitigationService.updateMitigationStatus(
      req.params.id,
      req.body,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Mitigation status updated successfully',
      data: mitigation
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    next(error);
  }
};

/**
 * @desc    Execute a pending mitigation action
 * @route   POST /api/mitigations/:id/execute
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const executeMitigation = async (req, res, next) => {
  try {
    const mitigation = await mitigationService.executeMitigation(
      req.params.id,
      req.body || {},
      req
    );

    res.status(200).json({
      success: true,
      message: 'Mitigation action executed successfully',
      data: mitigation
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    next(error);
  }
};

/**
 * @desc    Get dashboard metrics for Mitigation Center
 * @route   GET /api/mitigations/dashboard
 * @access  Private (Admin, SafetyOfficer, Operator, Manager)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await mitigationService.getDashboardStats();

    res.status(200).json({
      success: true,
      message: 'Mitigation dashboard stats fetched successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
