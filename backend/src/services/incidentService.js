import Incident from '../models/Incident.js';
import RailwayNode from '../models/RailwayNode.js';
import { logAudit } from '../utils/auditLogger.js';
import { getIO } from '../config/socket.js';
import mongoose from 'mongoose';

// Helper to determine severity based on risk score
export const calculateSeverity = (riskScore) => {
  const score = Number(riskScore);
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Critical';
};

// Helper to emit Socket.IO events safely
const emitIncidentSocketEvent = (eventName, incident) => {
  try {
    const io = getIO();
    // Resolve nodeId code or ID
    let nodeCodeOrId = '';
    if (incident.nodeId) {
      nodeCodeOrId = typeof incident.nodeId === 'object' ? (incident.nodeId.nodeCode || incident.nodeId._id) : incident.nodeId;
    }

    io.emit(eventName, {
      incidentId: incident.incidentId,
      nodeId: nodeCodeOrId,
      riskScore: incident.riskScore,
      severity: incident.severity,
      status: incident.status
    });
    console.log(`[SOCKET] Emitted ${eventName} event for incident: ${incident.incidentId}`);
  } catch (error) {
    console.error(`[SOCKET-EMIT-ERROR] Failed to emit ${eventName}: ${error.message}`);
  }
};

export const incidentService = {
  /**
   * Create an Incident
   * If an active incident (status = Open) already exists for nodeId, updates it instead.
   */
  async createIncident(incidentData, req) {
    const { nodeId, riskScore, description, source, title, assignedTeam, status = 'Open' } = incidentData;

    // Verify node exists
    const node = await RailwayNode.findById(nodeId);
    if (!node) {
      const error = new Error(`Railway Node with ID ${nodeId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Check if an active (Open) incident already exists for this nodeId
    let incident = await Incident.findOne({
      nodeId,
      status: 'Open'
    });

    const severity = calculateSeverity(riskScore);
    const incidentTitle = title || `Incident at ${node.nodeName}`;

    if (incident) {
      // Update existing incident
      incident.riskScore = riskScore;
      incident.severity = severity;
      incident.description = description || incident.description;
      if (title) incident.title = title;
      if (assignedTeam) incident.assignedTeam = assignedTeam;
      if (source) incident.source = source;

      await incident.save();
      incident = await Incident.findById(incident._id).populate('nodeId');

      // Log Audit Log
      await logAudit({
        req,
        module: 'Incident',
        action: 'Incident Updated',
        description: `Updated active incident ${incident.incidentId} for node ${node.nodeName} with risk score ${riskScore}`,
        metadata: { incidentId: incident.incidentId, nodeId }
      });

      // Emit update socket event
      emitIncidentSocketEvent('incident:update', incident);

      return incident;
    } else {
      // Create a new incident
      const newIncident = await Incident.create({
        nodeId,
        riskScore,
        severity,
        title: incidentTitle,
        description,
        status,
        assignedTeam,
        source
      });

      incident = await Incident.findById(newIncident._id).populate('nodeId');

      // Log Audit Log
      await logAudit({
        req,
        module: 'Incident',
        action: 'Incident Created',
        description: `Created new incident ${incident.incidentId} for node ${node.nodeName} with severity ${severity}`,
        metadata: { incidentId: incident.incidentId, nodeId }
      });

      // Emit create socket event
      emitIncidentSocketEvent('incident:create', incident);

      return incident;
    }
  },

  /**
   * Get filtered, search, paginated incident list
   */
  async getAllIncidents(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.nodeId) query.nodeId = filters.nodeId;
    if (filters.source) query.source = filters.source;

    return await Incident.find(query)
      .populate('nodeId')
      .sort({ createdAt: -1 });
  },

  /**
   * Get details of a single incident by ID or custom incidentId
   */
  async getIncidentById(id) {
    const isObjectId = mongoose.isValidObjectId(id);
    const incident = await Incident.findOne({
      $or: [
        { _id: isObjectId ? id : null },
        { incidentId: id }
      ]
    }).populate('nodeId');

    if (!incident) {
      const error = new Error(`Incident with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }
    return incident;
  },

  /**
   * Update incident fields (including auto-severity on risk update)
   */
  async updateIncident(id, updateData, req) {
    const isObjectId = mongoose.isValidObjectId(id);
    let incident = await Incident.findOne({
      $or: [
        { _id: isObjectId ? id : null },
        { incidentId: id }
      ]
    });

    if (!incident) {
      const error = new Error(`Incident with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }

    // Update risk score and auto-recalculate severity
    if (updateData.riskScore !== undefined) {
      incident.riskScore = updateData.riskScore;
      incident.severity = calculateSeverity(updateData.riskScore);
    }

    if (updateData.status) incident.status = updateData.status;
    if (updateData.description) incident.description = updateData.description;
    if (updateData.title) incident.title = updateData.title;
    if (updateData.assignedTeam !== undefined) incident.assignedTeam = updateData.assignedTeam;
    if (updateData.source) incident.source = updateData.source;

    await incident.save();
    incident = await Incident.findById(incident._id).populate('nodeId');

    await logAudit({
      req,
      module: 'Incident',
      action: 'Incident Updated',
      description: `Updated incident properties for ${incident.incidentId}`,
      metadata: { incidentId: incident.incidentId, updateData }
    });

    emitIncidentSocketEvent('incident:update', incident);

    return incident;
  },

  /**
   * Resolve an incident
   */
  async resolveIncident(id, req) {
    const isObjectId = mongoose.isValidObjectId(id);
    let incident = await Incident.findOne({
      $or: [
        { _id: isObjectId ? id : null },
        { incidentId: id }
      ]
    });

    if (!incident) {
      const error = new Error(`Incident with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }

    incident.status = 'Resolved';
    await incident.save();
    incident = await Incident.findById(incident._id).populate('nodeId');

    await logAudit({
      req,
      module: 'Incident',
      action: 'Incident Resolved',
      description: `Resolved incident ${incident.incidentId}`,
      metadata: { incidentId: incident.incidentId }
    });

    emitIncidentSocketEvent('incident:resolve', incident);

    return incident;
  },

  /**
   * Close an incident
   */
  async closeIncident(id, req) {
    const isObjectId = mongoose.isValidObjectId(id);
    let incident = await Incident.findOne({
      $or: [
        { _id: isObjectId ? id : null },
        { incidentId: id }
      ]
    });

    if (!incident) {
      const error = new Error(`Incident with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }

    incident.status = 'Closed';
    await incident.save();
    incident = await Incident.findById(incident._id).populate('nodeId');

    await logAudit({
      req,
      module: 'Incident',
      action: 'Incident Closed',
      description: `Closed incident ${incident.incidentId}`,
      metadata: { incidentId: incident.incidentId }
    });

    emitIncidentSocketEvent('incident:close', incident);

    return incident;
  },

  /**
   * Assign a team to an incident
   */
  async assignTeam(id, teamName, req) {
    const isObjectId = mongoose.isValidObjectId(id);
    let incident = await Incident.findOne({
      $or: [
        { _id: isObjectId ? id : null },
        { incidentId: id }
      ]
    });

    if (!incident) {
      const error = new Error(`Incident with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }

    incident.assignedTeam = teamName;
    await incident.save();
    incident = await Incident.findById(incident._id).populate('nodeId');

    await logAudit({
      req,
      module: 'Incident',
      action: 'Incident Assigned',
      description: `Assigned incident ${incident.incidentId} to Team ${teamName}`,
      metadata: { incidentId: incident.incidentId, assignedTeam: teamName }
    });

    emitIncidentSocketEvent('incident:update', incident);

    return incident;
  },

  /**
   * Get all open incidents
   */
  async getOpenIncidents() {
    return await Incident.find({ status: 'Open' }).populate('nodeId').sort({ createdAt: -1 });
  },

  /**
   * Get all critical severity incidents
   */
  async getCriticalIncidents() {
    return await Incident.find({ severity: 'Critical' }).populate('nodeId').sort({ createdAt: -1 });
  }
};

export default incidentService;
