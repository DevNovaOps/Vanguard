import Mitigation from '../models/Mitigation.js';
import Incident from '../models/Incident.js';
import RailwayNode from '../models/RailwayNode.js';
import { getIO } from '../config/socket.js';
import mongoose from 'mongoose';
import auditService from './auditService.js';
import webhookService from './webhookService.js';

// Helper to emit Socket.IO events safely
const emitMitigationSocketEvent = (eventName, mitigation) => {
  try {
    const io = getIO();
    io.emit(eventName, mitigation);
    console.log(`[SOCKET] Emitted ${eventName} event for mitigation: ${mitigation.mitigationId}`);
  } catch (error) {
    console.error(`[SOCKET-EMIT-ERROR] Failed to emit ${eventName}: ${error.message}`);
  }
};

// Helper to emit Incident updates when mitigation status modifies it
const emitIncidentSocketEvent = (eventName, incident) => {
  try {
    const io = getIO();
    io.emit(eventName, {
      incidentId: incident.incidentId,
      nodeId: incident.nodeId?._id || incident.nodeId,
      riskScore: incident.riskScore,
      severity: incident.severity,
      status: incident.status
    });
  } catch (error) {
    console.error(`[SOCKET-EMIT-ERROR] Failed to emit incident event: ${error.message}`);
  }
};

export const mitigationService = {
  /**
   * Get filtered list of mitigations
   */
  async getAllMitigations(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.nodeId) query.nodeId = filters.nodeId;
    if (filters.executionSource) query.executionSource = filters.executionSource;
    if (filters.action) query.action = filters.action;
    if (filters.type) query.type = filters.type;
    if (filters.incidentId) query.incidentId = filters.incidentId;

    if (filters.search) {
      query.$or = [
        { mitigationId: { $regex: filters.search, $options: 'i' } },
        { executionNotes: { $regex: filters.search, $options: 'i' } },
        { action: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return await Mitigation.find(query)
      .populate('nodeId')
      .populate('incidentId')
      .populate('executedBy', 'name email role')
      .sort({ createdAt: -1 });
  },

  /**
   * Get mitigation by ID or Code
   */
  async getMitigationById(id) {
    const isObjectId = mongoose.isValidObjectId(id);
    const mitigation = await Mitigation.findOne({
      $or: [
        { _id: isObjectId ? id : null },
        { mitigationId: id }
      ]
    })
      .populate('nodeId')
      .populate('incidentId')
      .populate('executedBy', 'name email role');

    if (!mitigation) {
      const error = new Error(`Mitigation action with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }
    return mitigation;
  },

  /**
   * Create a new mitigation action
   */
  async createMitigation(data, req) {
    const { incidentId, nodeId, action, severity, executionSource, executionNotes, agentActionId, executedBy } = data;

    // Verify incident and node exist
    const node = await RailwayNode.findById(nodeId);
    if (!node) {
      const error = new Error(`Railway Node with ID ${nodeId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      const error = new Error(`Incident with ID ${incidentId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Resolve execution source and executedBy from request if not explicitly provided
    let resolvedSource = executionSource;
    if (!resolvedSource) {
      if (req && req.user) {
        if (req.user.role === 'Admin') resolvedSource = 'ADMIN';
        else if (req.user.role === 'SafetyOfficer') resolvedSource = 'SAFETY_OFFICER';
        else resolvedSource = 'OPERATOR';
      } else {
        resolvedSource = 'OPERATOR';
      }
    }

    const resolvedExecutedBy = executedBy || (req && req.user ? req.user._id : null);

    const newMitigation = await Mitigation.create({
      incidentId,
      nodeId,
      action,
      type: action, // type mirrors action for frontend compatibility
      severity,
      status: 'Pending',
      executionSource: resolvedSource,
      executionNotes: executionNotes || '',
      agentActionId: agentActionId || null,
      executedBy: resolvedExecutedBy
    });

    const populated = await Mitigation.findById(newMitigation._id)
      .populate('nodeId')
      .populate('incidentId')
      .populate('executedBy', 'name email role');

    // Auto-update Incident status to 'Mitigating' if it's Open/Investigating
    if (['Open', 'Investigating'].includes(incident.status)) {
      incident.status = 'Mitigating';
      await incident.save();
      emitIncidentSocketEvent('incident:update', incident);
    }

    // Log Audit
    await auditService.logEvent({
      req,
      module: 'Mitigation',
      action: 'Mitigation Created',
      description: `Created mitigation ${populated.mitigationId} (${action}) for node ${node.nodeName}`,
      severity: severity === 'Critical' ? 'Critical' : 'Warning',
      metadata: { mitigationId: populated.mitigationId, nodeId, incidentId }
    });

    // Emit Socket
    emitMitigationSocketEvent('mitigation:create', populated);

    return populated;
  },

  /**
   * Update mitigation status
   */
  async updateMitigationStatus(id, updateData, req) {
    const { status, executionNotes } = updateData;

    const mitigation = await Mitigation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { mitigationId: id }
      ]
    });

    if (!mitigation) {
      const error = new Error(`Mitigation action with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }

    // Capture previous status for audit logging
    const oldStatus = mitigation.status;
    mitigation.status = status;

    if (executionNotes !== undefined) {
      mitigation.executionNotes = executionNotes;
    }

    // Adjust startedAt, completedAt, executedAt based on transitions
    if (status === 'InProgress') {
      mitigation.startedAt = new Date();
    } else if (status === 'Executed') {
      mitigation.executedAt = new Date();
      if (req?.user) {
        mitigation.executedBy = req.user._id;
      }
    } else if (['Completed', 'Failed', 'Cancelled'].includes(status)) {
      mitigation.completedAt = new Date();
    }

    await mitigation.save();

    const populated = await Mitigation.findById(mitigation._id)
      .populate('nodeId')
      .populate('incidentId')
      .populate('executedBy', 'name email role');

    // Audit Log
    let actionName = 'Mitigation Updated';
    let severityLevel = 'Info';
    if (status === 'Failed') {
      actionName = 'Mitigation Failed';
      severityLevel = 'Critical';
    } else if (status === 'Cancelled') {
      actionName = 'Mitigation Cancelled';
    } else if (status === 'InProgress') {
      actionName = 'Mitigation Approved';
    } else if (status === 'Executed' || status === 'Completed') {
      actionName = 'Mitigation Executed';
    }

    await auditService.logEvent({
      req,
      module: 'Mitigation',
      action: actionName,
      description: `Updated mitigation ${populated.mitigationId} status from ${oldStatus} to ${status}`,
      severity: severityLevel,
      metadata: { mitigationId: populated.mitigationId, oldStatus, newStatus: status }
    });

    // Socket Emit
    emitMitigationSocketEvent('mitigation:update', populated);

    return populated;
  },

  /**
   * Execute a pending mitigation action
   */
  async executeMitigation(id, data, req) {
    const { executionNotes } = data;

    const mitigation = await Mitigation.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { mitigationId: id }
      ]
    });

    if (!mitigation) {
      const error = new Error(`Mitigation action with ID or Code '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }

    if (mitigation.status === 'Completed' || mitigation.status === 'Cancelled') {
      const error = new Error(`Mitigation action is already ${mitigation.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    // RBAC: Operator can only execute if they are assigned, or if it's unassigned
    if (req?.user?.role === 'Operator') {
      if (mitigation.executedBy && mitigation.executedBy.toString() !== req.user._id.toString()) {
        const error = new Error('Forbidden access. You are not assigned to execute this mitigation.');
        error.statusCode = 403;
        throw error;
      }
    }

    // Transition state
    mitigation.status = 'Executed';
    mitigation.executedAt = new Date();
    if (req?.user) {
      mitigation.executedBy = req.user._id;
    }
    if (executionNotes) {
      mitigation.executionNotes = executionNotes;
    }

    await mitigation.save();

    const populated = await Mitigation.findById(mitigation._id)
      .populate('nodeId')
      .populate('incidentId')
      .populate('executedBy', 'name email role');

    // Audit Log
    await auditService.logEvent({
      req,
      module: 'Mitigation',
      action: 'Mitigation Executed',
      description: `Executed mitigation ${populated.mitigationId} (${populated.action}) on node ${populated.targetName}`,
      severity: 'Info',
      metadata: { mitigationId: populated.mitigationId }
    });

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('MITIGATION_EXECUTED', populated, req);
    } catch (webErr) {
      console.error(`[MITIGATION-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

    // Socket Emits
    emitMitigationSocketEvent('mitigation:execute', populated);
    emitMitigationSocketEvent('mitigation:update', populated);

    return populated;
  },

  /**
   * Compile dashboard metrics
   */
  async getDashboardStats() {
    const totalMitigations = await Mitigation.countDocuments({});
    const pendingActions = await Mitigation.countDocuments({ status: 'Pending' });
    const activeActions = await Mitigation.countDocuments({ status: 'InProgress' });
    const completedActions = await Mitigation.countDocuments({ status: { $in: ['Completed', 'Executed'] } });
    const failedActions = await Mitigation.countDocuments({ status: 'Failed' });

    const latestMitigation = await Mitigation.findOne({})
      .populate('nodeId')
      .populate('incidentId')
      .populate('executedBy', 'name email role')
      .sort({ createdAt: -1 });

    return {
      totalMitigations,
      pendingActions,
      activeActions,
      completedActions,
      failedActions,
      latestMitigation
    };
  }
};

export default mitigationService;
