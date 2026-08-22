import mitigationRepository from '../repositories/mitigationRepository.js';
import incidentRepository from '../repositories/incidentRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
import { getIO } from '../config/socket.js';
import auditService from './auditService.js';
import webhookService from './webhookService.js';
import notificationService from './notificationService.js';

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
    return await mitigationRepository.findAll(filters);
  },

  /**
   * Get mitigation by ID or Code
   */
  async getMitigationById(id) {
    const numId = parseInt(id, 10);
    let mitigation;
    if (!isNaN(numId) && String(numId) === String(id)) {
      mitigation = await mitigationRepository.findById(numId);
    } else {
      mitigation = await mitigationRepository.findByMitigationId(id);
    }

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
    const node = await railwayNodeRepository.findById(nodeId);
    if (!node) {
      const error = new Error(`Railway Node with ID ${nodeId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const incident = await incidentRepository.findById(incidentId);
    if (!incident) {
      const error = new Error(`Incident with ID ${incidentId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Resolve execution source and executedBy from request if not explicitly provided
    let resolvedSource = executionSource;
    if (!resolvedSource) {
      if (req && req.user) {
        const userRoleLower = (req.user.role || '').toLowerCase();
        if (userRoleLower === 'admin') resolvedSource = 'ADMIN';
        else if (userRoleLower === 'safetyofficer' || userRoleLower === 'safety_officer') resolvedSource = 'SAFETY_OFFICER';
        else resolvedSource = 'OPERATOR';
      } else {
        resolvedSource = 'OPERATOR';
      }
    }

    const resolvedExecutedBy = executedBy || (req && req.user ? req.user._id : null);

    const populated = await mitigationRepository.create({
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

    // Auto-update Incident status to 'Mitigating' if it's Open/Investigating
    if (['Open', 'Investigating'].includes(incident.status)) {
      const updatedIncident = await incidentRepository.update(incident._id, { status: 'Mitigating' });
      emitIncidentSocketEvent('incident:update', updatedIncident);
    }

    // Trigger Notification
    const notifSeverity = populated.severity === 'Medium' ? 'Warning' : (populated.severity === 'Low' ? 'Info' : populated.severity);
    try {
      await notificationService.create({
        title: `Mitigation Action Created: ${populated.action}`,
        message: `Mitigation action ${populated.mitigationId} (${populated.action}) has been created for node ${node.nodeName}. Severity: ${populated.severity}. Notes: ${populated.executionNotes || 'None'}`,
        type: 'MitigationCreated',
        severity: notifSeverity,
        module: 'Mitigation',
        recipientRoles: ['SafetyOfficer', 'Operator'],
        metadata: { mitigationId: populated._id, mitigationCode: populated.mitigationId, nodeId: populated.nodeId?._id, incidentId: populated.incidentId?._id }
      });
    } catch (notifErr) {
      console.error(`[MITIGATION-CREATE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
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

    let mitigation = await this.getMitigationById(id);
    const oldStatus = mitigation.status;

    const updates = { status };
    if (executionNotes !== undefined) {
      updates.executionNotes = executionNotes;
    }

    // Adjust startedAt, completedAt, executedAt based on transitions
    if (status === 'InProgress') {
      updates.startedAt = new Date();
    } else if (status === 'Executed') {
      updates.executedAt = new Date();
      if (req?.user) {
        updates.executedBy = req.user._id;
      }
    } else if (['Completed', 'Failed', 'Cancelled'].includes(status)) {
      updates.completedAt = new Date();
    }

    const populated = await mitigationRepository.update(mitigation._id, updates);

    // Trigger notification based on status change
    if (status === 'Failed') {
      try {
        await notificationService.create({
          title: `Mitigation Action Failed: ${populated.action}`,
          message: `Mitigation action ${populated.mitigationId} (${populated.action}) failed for node ${populated.nodeId?.nodeName || 'unknown'}. Notes: ${populated.executionNotes || 'None'}`,
          type: 'MitigationFailed',
          severity: 'Critical',
          module: 'Mitigation',
          recipientRoles: ['SafetyOfficer', 'Operator'],
          metadata: { mitigationId: populated._id, mitigationCode: populated.mitigationId, nodeId: populated.nodeId?._id }
        });
      } catch (notifErr) {
        console.error(`[MITIGATION-FAIL-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }
    } else if (status === 'Executed' || status === 'Completed') {
      const notifSeverity = populated.severity === 'Medium' ? 'Warning' : (populated.severity === 'Low' ? 'Info' : populated.severity);
      try {
        await notificationService.create({
          title: `Mitigation Action Executed: ${populated.action}`,
          message: `Mitigation action ${populated.mitigationId} (${populated.action}) has been successfully executed for node ${populated.nodeId?.nodeName || 'unknown'}.`,
          type: 'MitigationExecuted',
          severity: notifSeverity,
          module: 'Mitigation',
          recipientRoles: ['SafetyOfficer', 'Operator'],
          metadata: { mitigationId: populated._id, mitigationCode: populated.mitigationId, nodeId: populated.nodeId?._id }
        });
      } catch (notifErr) {
        console.error(`[MITIGATION-EXECUTE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }
    }

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

    let mitigation = await this.getMitigationById(id);

    if (mitigation.status === 'Completed' || mitigation.status === 'Cancelled') {
      const error = new Error(`Mitigation action is already ${mitigation.status.toLowerCase()}`);
      error.statusCode = 400;
      throw error;
    }

    // RBAC: Operator can only execute if they are assigned, or if it's unassigned
    const userRoleLower = (req?.user?.role || '').toLowerCase();
    if (userRoleLower === 'operator') {
      if (mitigation.executedBy && (mitigation.executedBy._id || mitigation.executedBy).toString() !== req.user._id.toString()) {
        const error = new Error('Forbidden access. You are not assigned to execute this mitigation.');
        error.statusCode = 403;
        throw error;
      }
    }

    const updates = {
      status: 'Executed',
      executedAt: new Date()
    };
    if (req?.user) {
      updates.executedBy = req.user._id;
    }
    if (executionNotes) {
      updates.executionNotes = executionNotes;
    }

    const populated = await mitigationRepository.update(mitigation._id, updates);

    // Trigger Notification
    const notifSeverity = populated.severity === 'Medium' ? 'Warning' : (populated.severity === 'Low' ? 'Info' : populated.severity);
    try {
      await notificationService.create({
        title: `Mitigation Action Executed: ${populated.action}`,
        message: `Mitigation action ${populated.mitigationId} (${populated.action}) has been successfully executed for node ${populated.nodeId?.nodeName || 'unknown'}.`,
        type: 'MitigationExecuted',
        severity: notifSeverity,
        module: 'Mitigation',
        recipientRoles: ['SafetyOfficer', 'Operator'],
        metadata: { mitigationId: populated._id, mitigationCode: populated.mitigationId, nodeId: populated.nodeId?._id }
      });
    } catch (notifErr) {
      console.error(`[MITIGATION-EXECUTE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
    }

    // Audit Log
    await auditService.logEvent({
      req,
      module: 'Mitigation',
      action: 'Mitigation Executed',
      description: `Executed mitigation ${populated.mitigationId} (${populated.action}) on node ${populated.nodeId?.nodeName || 'unknown'}`,
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
    return await mitigationRepository.getDashboardStats();
  }
};

export default mitigationService;
