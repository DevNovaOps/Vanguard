import { validationResult } from 'express-validator';
import aiAgentService from '../services/aiAgentService.js';

/**
 * @desc    Evaluate telemetry and determine autonomous agent action
 * @route   POST /api/agent/evaluate
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const evaluateTelemetry = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const action = await aiAgentService.evaluateTelemetry(req.body, req);
    res.status(200).json({
      success: true,
      action
    });
  } catch (error) {
    if (error.message === 'Railway Node not found') {
      res.status(404);
    }
    next(error);
  }
};

/**
 * @desc    Get all historical autonomous agent decisions
 * @route   GET /api/agent/actions
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const getActions = async (req, res, next) => {
  try {
    const actions = await aiAgentService.getActions();
    res.status(200).json({
      success: true,
      count: actions.length,
      actions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed view of a single autonomous decision
 * @route   GET /api/agent/actions/:id
 * @access  Private (Admin, SafetyOfficer, Operator)
 */
export const getActionById = async (req, res, next) => {
  try {
    const action = await aiAgentService.getActionById(req.params.id);
    res.status(200).json({
      success: true,
      action
    });
  } catch (error) {
    if (error.message === 'Agent Action not found') {
      res.status(404);
    }
    next(error);
  }
};

/**
 * @desc    Get dashboard metrics for Autonomous AI Agent
 * @route   GET /api/agent/dashboard
 * @access  Private (Admin, Manager)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await aiAgentService.getDashboardStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};
