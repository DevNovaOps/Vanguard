import incidentService from '../services/incidentService.js';
import { validationResult } from 'express-validator';

/**
 * @desc    Create a new incident manually or programmatically
 * @route   POST /api/incidents
 * @access  Private
 */
export const createIncident = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const incident = await incidentService.createIncident(req.body, req);
    res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all incidents with optional filters
 * @route   GET /api/incidents
 * @access  Private
 */
export const getAllIncidents = async (req, res, next) => {
  try {
    const filter = {
      status: req.query.status,
      severity: req.query.severity,
      nodeId: req.query.nodeId,
      source: req.query.source
    };
    const incidents = await incidentService.getAllIncidents(filter);
    res.status(200).json({
      success: true,
      message: 'Incidents fetched successfully',
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a single incident
 * @route   GET /api/incidents/:id
 * @access  Private
 */
export const getIncidentById = async (req, res, next) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Incident details fetched successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update incident details
 * @route   PATCH /api/incidents/:id
 * @access  Private
 */
export const updateIncident = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const incident = await incidentService.updateIncident(req.params.id, req.body, req);
    res.status(200).json({
      success: true,
      message: 'Incident updated successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve an incident
 * @route   PATCH /api/incidents/:id/resolve
 * @access  Private
 */
export const resolveIncident = async (req, res, next) => {
  try {
    const incident = await incidentService.resolveIncident(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Incident resolved successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Close an incident
 * @route   PATCH /api/incidents/:id/close
 * @access  Private
 */
export const closeIncident = async (req, res, next) => {
  try {
    const incident = await incidentService.closeIncident(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Incident closed successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign a team to an incident
 * @route   PATCH /api/incidents/:id/assign
 * @access  Private
 */
export const assignTeam = async (req, res, next) => {
  const { assignedTeam } = req.body;
  if (!assignedTeam) {
    return res.status(400).json({
      success: false,
      message: 'Assigned team is required'
    });
  }

  try {
    const incident = await incidentService.assignTeam(req.params.id, assignedTeam, req);
    res.status(200).json({
      success: true,
      message: 'Incident assigned successfully',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all open incidents
 * @route   GET /api/incidents/open
 * @access  Private
 */
export const getOpenIncidents = async (req, res, next) => {
  try {
    const incidents = await incidentService.getOpenIncidents();
    res.status(200).json({
      success: true,
      message: 'Open incidents fetched successfully',
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all critical incidents
 * @route   GET /api/incidents/critical
 * @access  Private
 */
export const getCriticalIncidents = async (req, res, next) => {
  try {
    const incidents = await incidentService.getCriticalIncidents();
    res.status(200).json({
      success: true,
      message: 'Critical incidents fetched successfully',
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};
