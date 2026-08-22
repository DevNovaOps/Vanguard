import incidentRepository from '../repositories/incidentRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
import { getIO } from '../config/socket.js';
import incidentPriorityService from './incidentPriorityService.js';
import auditService from './auditService.js';
import webhookService from './webhookService.js';
import notificationService from './notificationService.js';

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
    const node = await railwayNodeRepository.findById(nodeId);
    if (!node) {
      const error = new Error(`Railway Node with ID ${nodeId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Check if an active (Open) incident already exists for this nodeId
    let incident = await incidentRepository.findOpenByNodeId(nodeId);

    const severity = calculateSeverity(riskScore);
    const incidentTitle = title || `Incident at ${node.nodeName}`;

    if (incident) {
      const isEscalation = riskScore > incident.riskScore;
      const oldRisk = incident.riskScore;

      // Update existing incident
      const updateData = {
        riskScore,
        severity,
        description: description || incident.description
      };
      if (title) updateData.title = title;
      if (assignedTeam) updateData.assignedTeam = assignedTeam;
      if (source) updateData.source = source;

      incident = await incidentRepository.update(incident._id, updateData);

      // Log Audit Log
      await auditService.logIncidentUpdated(req, incident);

      // Trigger Webhook Event
      try {
        await webhookService.triggerEvent('INCIDENT_UPDATED', incident, req);
      } catch (webErr) {
        console.error(`[INCIDENT-UPDATE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
      }

      // Log Priority Audits
      if (isEscalation) {
        // Trigger Notification
        const notifSeverity = incident.severity === 'Medium' ? 'Warning' : incident.severity;
        const mappedSeverity = notifSeverity === 'Low' ? 'Info' : notifSeverity;
        try {
          await notificationService.create({
            title: `Incident Escalated: ${incident.title}`,
            message: `Incident ${incident.incidentId} at node ${incident.nodeId?.nodeName || 'unknown'} has been escalated. Risk score increased from ${oldRisk} to ${riskScore}/100.`,
            type: 'IncidentEscalated',
            severity: mappedSeverity,
            module: 'Incident',
            recipientRoles: ['SafetyOfficer', 'Operator'],
            metadata: { incidentId: incident._id, incidentCode: incident.incidentId, nodeId: incident.nodeId?._id }
          });
        } catch (notifErr) {
          console.error(`[INCIDENT-ESCALATE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
        }

        await auditService.logEvent({
          req,
          module: 'Incident',
          action: 'Incident Escalated',
          description: `Incident ${incident.incidentId} escalated from risk score ${oldRisk} to ${riskScore}`,
          severity: 'Warning',
          metadata: { incidentId: incident.incidentId, oldRisk, newRisk: riskScore }
        });
      } else {
        await auditService.logEvent({
          req,
          module: 'Incident',
          action: 'Priority Updated',
          description: `Priority rank updated for incident ${incident.incidentId} (new risk score: ${riskScore})`,
          severity: 'Info',
          metadata: { incidentId: incident.incidentId, riskScore }
        });
      }

      // Emit update socket event
      emitIncidentSocketEvent('incident:update', incident);

      // Recalculate priorities in Max Heap
      await incidentPriorityService.triggerRecalculation(req);

      return incident;
    } else {
      // Create a new incident
      incident = await incidentRepository.create({
        nodeId,
        riskScore,
        severity,
        title: incidentTitle,
        description,
        status,
        assignedTeam,
        source
      });

      // Trigger Notification
      const notifSeverity = incident.severity === 'Medium' ? 'Warning' : incident.severity;
      const mappedSeverity = notifSeverity === 'Low' ? 'Info' : notifSeverity;
      try {
        await notificationService.create({
          title: `Incident Created: ${incident.title}`,
          message: `A new incident has been generated at node ${incident.nodeId?.nodeName || 'unknown'} with a risk score of ${incident.riskScore}/100 (${incident.severity}). Source: ${incident.source}.`,
          type: 'IncidentCreated',
          severity: mappedSeverity,
          module: 'Incident',
          recipientRoles: ['SafetyOfficer', 'Operator'],
          metadata: { incidentId: incident._id, incidentCode: incident.incidentId, nodeId: incident.nodeId?._id }
        });
      } catch (notifErr) {
        console.error(`[INCIDENT-CREATE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }

      // Log Audit Log
      await auditService.logIncidentCreated(req, incident);

      // Trigger Webhook Event
      try {
        await webhookService.triggerEvent('INCIDENT_CREATED', incident, req);
      } catch (webErr) {
        console.error(`[INCIDENT-CREATE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
      }

      // Log Audit for Incident Prioritized
      await auditService.logEvent({
        req,
        module: 'Incident',
        action: 'Incident Prioritized',
        description: `Incident ${incident.incidentId} prioritized in queue with risk score ${riskScore}`,
        severity: severity === 'Critical' ? 'Critical' : 'Warning',
        metadata: { incidentId: incident.incidentId, riskScore, severity }
      });

      // Emit create socket event
      emitIncidentSocketEvent('incident:create', incident);

      // Recalculate priorities in Max Heap
      await incidentPriorityService.triggerRecalculation(req);

      return incident;
    }
  },

  /**
   * Get filtered, search, paginated incident list
   */
  async getAllIncidents(filters = {}) {
    return await incidentRepository.findAll(filters);
  },

  /**
   * Get details of a single incident by ID or custom incidentId
   */
  async getIncidentById(id) {
    const numId = parseInt(id, 10);
    let incident;
    if (!isNaN(numId) && String(numId) === String(id)) {
      incident = await incidentRepository.findById(numId);
    } else {
      incident = await incidentRepository.findByIncidentId(id);
    }

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
    let incident = await this.getIncidentById(id);
    const oldRisk = incident.riskScore;
    const isEscalation = updateData.riskScore !== undefined && updateData.riskScore > oldRisk;

    // Update risk score and auto-recalculate severity
    const updates = { ...updateData };
    if (updateData.riskScore !== undefined) {
      updates.severity = calculateSeverity(updateData.riskScore);
    }

    incident = await incidentRepository.update(incident._id, updates);

    await auditService.logIncidentUpdated(req, incident);

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('INCIDENT_UPDATED', incident, req);
    } catch (webErr) {
      console.error(`[INCIDENT-UPDATE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

    // Log Priority Audits
    if (isEscalation) {
      // Trigger Notification
      const notifSeverity = incident.severity === 'Medium' ? 'Warning' : incident.severity;
      const mappedSeverity = notifSeverity === 'Low' ? 'Info' : notifSeverity;
      try {
        await notificationService.create({
          title: `Incident Escalated: ${incident.title}`,
          message: `Incident ${incident.incidentId} at node ${incident.nodeId?.nodeName || 'unknown'} has been escalated. Risk score increased from ${oldRisk} to ${updateData.riskScore}/100.`,
          type: 'IncidentEscalated',
          severity: mappedSeverity,
          module: 'Incident',
          recipientRoles: ['SafetyOfficer', 'Operator'],
          metadata: { incidentId: incident._id, incidentCode: incident.incidentId, nodeId: incident.nodeId?._id }
        });
      } catch (notifErr) {
        console.error(`[INCIDENT-ESCALATE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }

      await auditService.logEvent({
        req,
        module: 'Incident',
        action: 'Incident Escalated',
        description: `Incident ${incident.incidentId} escalated from risk score ${oldRisk} to ${updateData.riskScore}`,
        severity: 'Warning',
        metadata: { incidentId: incident.incidentId, oldRisk, newRisk: updateData.riskScore }
      });
    } else if (updateData.riskScore !== undefined) {
      await auditService.logEvent({
        req,
        module: 'Incident',
        action: 'Priority Updated',
        description: `Priority rank updated for incident ${incident.incidentId} (new risk score: ${updateData.riskScore})`,
        severity: 'Info',
        metadata: { incidentId: incident.incidentId, riskScore: updateData.riskScore }
      });
    }

    emitIncidentSocketEvent('incident:update', incident);

    // Recalculate priorities in Max Heap
    await incidentPriorityService.triggerRecalculation(req);

    return incident;
  },

  /**
   * Resolve an incident
   */
  async resolveIncident(id, req) {
    let incident = await this.getIncidentById(id);
    incident = await incidentRepository.update(incident._id, { status: 'Resolved' });

    await auditService.logIncidentResolved(req, incident);

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('INCIDENT_RESOLVED', incident, req);
    } catch (webErr) {
      console.error(`[INCIDENT-RESOLVE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

    emitIncidentSocketEvent('incident:resolve', incident);

    // Recalculate priorities in Max Heap
    await incidentPriorityService.triggerRecalculation(req);

    return incident;
  },

  /**
   * Close an incident
   */
  async closeIncident(id, req) {
    let incident = await this.getIncidentById(id);
    incident = await incidentRepository.update(incident._id, { status: 'Closed' });

    // Trigger Notification
    try {
      await notificationService.create({
        title: `Incident Closed: ${incident.title}`,
        message: `Incident ${incident.incidentId} at node ${incident.nodeId?.nodeName || 'unknown'} has been closed.`,
        type: 'IncidentClosed',
        severity: 'Info',
        module: 'Incident',
        recipientRoles: ['SafetyOfficer', 'Operator'],
        metadata: { incidentId: incident._id, incidentCode: incident.incidentId, nodeId: incident.nodeId?._id }
      });
    } catch (notifErr) {
      console.error(`[INCIDENT-CLOSE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
    }

    await auditService.logEvent({
      req,
      module: 'Incident',
      action: 'Incident Closed',
      description: `Closed incident ${incident.incidentId}`,
      severity: 'Info',
      metadata: { incidentId: incident.incidentId }
    });

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('INCIDENT_CLOSED', incident, req);
    } catch (webErr) {
      console.error(`[INCIDENT-CLOSE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

    emitIncidentSocketEvent('incident:close', incident);

    // Recalculate priorities in Max Heap
    await incidentPriorityService.triggerRecalculation(req);

    return incident;
  },

  /**
   * Assign a team to an incident
   */
  async assignTeam(id, teamName, req) {
    let incident = await this.getIncidentById(id);
    incident = await incidentRepository.update(incident._id, { assignedTeam: teamName });

    await auditService.logEvent({
      req,
      module: 'Incident',
      action: 'Incident Assigned',
      description: `Assigned incident ${incident.incidentId} to Team ${teamName}`,
      severity: 'Info',
      metadata: { incidentId: incident.incidentId, assignedTeam: teamName }
    });

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('INCIDENT_UPDATED', incident, req);
    } catch (webErr) {
      console.error(`[INCIDENT-UPDATE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

    emitIncidentSocketEvent('incident:update', incident);

    // Recalculate priorities in Max Heap
    await incidentPriorityService.triggerRecalculation(req);

    return incident;
  },

  /**
   * Get all open incidents
   */
  async getOpenIncidents() {
    return await incidentRepository.findOpen();
  },

  /**
   * Get all critical severity incidents
   */
  async getCriticalIncidents() {
    return await incidentRepository.findCritical();
  }
};

export default incidentService;
