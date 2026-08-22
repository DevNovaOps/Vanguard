import auditLogRepository from '../repositories/auditLogRepository.js';
import { getIO } from '../config/socket.js';

export const auditService = {
  /**
   * Core logging function
   */
  async logEvent(params = {}) {
    try {
      const log = await auditLogRepository.create(params);

      console.log(`[AUDIT-LOG] Recorded event: ${log.action} in module ${log.module} (${log.severity})`);

      // Emit Socket.IO Events
      try {
        const io = getIO();
        const payload = {
          auditId: log.auditId,
          module: log.module,
          action: log.action,
          severity: log.severity,
          user: log.username,
          timestamp: log.timestamp || log.createdAt,
          details: log.description,
          result: log.severity === 'Critical' ? 'Violation' : (log.severity === 'Warning' ? 'Warning' : 'Success')
        };

        // Emit to all clients listening to create events
        io.emit('audit:create', payload);

        // Emit critical alert if applicable
        if (log.severity === 'Critical') {
          io.emit('audit:critical', payload);
        }

        // Emit simulation alert if simulation event
        if (log.module === 'Simulation' || log.action.toLowerCase().includes('simulation')) {
          io.emit('audit:simulation', payload);
        }
      } catch (socketErr) {
        // Log socket emission error without interrupting
        console.error(`[AUDIT-SOCKET-ERROR] Socket emission failed: ${socketErr.message}`);
      }

      return log;
    } catch (error) {
      console.error(`[AUDIT-SERVICE-ERROR] Failed to create audit log: ${error.message}`);
      // Return null rather than crashing caller
      return null;
    }
  },

  /**
   * Helper logs
   */
  async logLogin(req, user, success = true, errorReason = null) {
    return this.logEvent({
      req,
      userId: user?._id,
      username: user?.name || user?.email,
      role: user?.role,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      module: 'Authentication',
      description: success 
        ? `User ${user?.email || 'unknown'} logged in successfully` 
        : `Failed login attempt for email ${user?.email || 'unknown'}. Reason: ${errorReason || 'Invalid credentials'}`,
      severity: success ? 'Info' : 'Warning',
      metadata: { email: user?.email, success, errorReason }
    });
  },

  async logLogout(req, user) {
    return this.logEvent({
      req,
      userId: user?._id,
      username: user?.name,
      role: user?.role,
      action: 'USER_LOGOUT',
      module: 'Authentication',
      description: `User ${user?.email || 'unknown'} logged out`,
      severity: 'Info',
      metadata: { email: user?.email }
    });
  },

  async logComplianceViolation(req, violation) {
    const ruleCode = violation.ruleId?.ruleCode || 'Rule';
    const severity = violation.severity === 'Critical' ? 'Critical' : 'Warning';
    return this.logEvent({
      req,
      action: 'Compliance Violation',
      module: 'Compliance',
      entityType: 'ComplianceViolation',
      entityId: violation._id?.toString(),
      description: `Compliance violation detected: Rule ${ruleCode} breached at node. Value: ${violation.actualValue}`,
      severity,
      metadata: { violationId: violation._id, ruleCode, actualValue: violation.actualValue }
    });
  },

  async logRiskCalculation(req, data) {
    const severity = data.riskScore > 80 ? 'Critical' : (data.riskScore > 60 ? 'Warning' : 'Info');
    return this.logEvent({
      req,
      action: 'Risk Recalculation',
      module: 'Risk',
      entityType: 'RailwayNode',
      entityId: data.nodeId?.toString(),
      description: `Risk score for node calculated as ${data.riskScore}/100`,
      severity,
      metadata: data
    });
  },

  async logIncidentCreated(req, incident) {
    const severity = incident.severity === 'Critical' ? 'Critical' : 'Warning';
    return this.logEvent({
      req,
      action: 'Incident Created',
      module: 'Incident',
      entityType: 'Incident',
      entityId: incident._id?.toString(),
      description: `Incident ${incident.incidentId} created: ${incident.title}`,
      severity,
      metadata: { incidentId: incident.incidentId, riskScore: incident.riskScore }
    });
  },

  async logIncidentUpdated(req, incident) {
    return this.logEvent({
      req,
      action: 'Incident Updated',
      module: 'Incident',
      entityType: 'Incident',
      entityId: incident._id?.toString(),
      description: `Incident ${incident.incidentId} updated`,
      severity: 'Info',
      metadata: { incidentId: incident.incidentId, status: incident.status }
    });
  },

  async logIncidentResolved(req, incident) {
    return this.logEvent({
      req,
      action: 'Incident Resolved',
      module: 'Incident',
      entityType: 'Incident',
      entityId: incident._id?.toString(),
      description: `Incident ${incident.incidentId} resolved`,
      severity: 'Info',
      metadata: { incidentId: incident.incidentId }
    });
  },

  async logAgentDecision(req, decision) {
    return this.logEvent({
      req,
      action: 'Agent Decision',
      module: 'AutonomousAgent',
      entityType: 'AgentAction',
      entityId: decision._id?.toString(),
      description: `AI Agent evaluation completed: ${decision.decision}`,
      severity: decision.severity === 'Critical' ? 'Critical' : 'Info',
      metadata: { decisionId: decision._id, decision: decision.decision, confidence: decision.confidence }
    });
  },

  async logMitigationAction(req, mitigation) {
    return this.logEvent({
      req,
      action: 'Mitigation Executed',
      module: 'Mitigation',
      entityType: 'Mitigation',
      entityId: mitigation._id?.toString(),
      description: `Mitigation action ${mitigation.mitigationId} executed. Status: ${mitigation.status}`,
      severity: mitigation.status === 'Failed' ? 'Critical' : 'Info',
      metadata: { mitigationId: mitigation.mitigationId, action: mitigation.action, status: mitigation.status }
    });
  },

  async logSimulationStart(req, node) {
    return this.logEvent({
      req,
      action: 'Simulation Started',
      module: 'Simulation',
      description: `Failure simulation started on node ${node.nodeName}`,
      severity: 'Info',
      metadata: { nodeId: node._id, nodeCode: node.nodeCode }
    });
  },

  async logSimulationStep(req, stepData) {
    return this.logEvent({
      req,
      action: stepData.name,
      module: 'Simulation',
      description: stepData.description,
      severity: stepData.severity || 'Info',
      metadata: stepData
    });
  },

  async logSimulationComplete(req, node) {
    return this.logEvent({
      req,
      action: 'Simulation Completed',
      module: 'Simulation',
      description: `Failure simulation completed for node ${node.nodeName}. System stabilized.`,
      severity: 'Info',
      metadata: { nodeId: node._id }
    });
  },

  async logWebhookEvent(req, data) {
    return this.logEvent({
      req,
      action: 'Webhook Fired',
      module: 'Webhook',
      description: `Webhook event sent to ${data.webhookName || data.webhookId}`,
      severity: data.status === 'failed' ? 'Warning' : 'Info',
      metadata: data
    });
  },

  /**
   * Advanced query
   */
  async getAuditLogs(params = {}) {
    return auditLogRepository.findAll(params);
  },

  /**
   * Dashboard statistics aggregations
   */
  async getAuditStatistics() {
    return auditLogRepository.getStatistics();
  },

  /**
   * Export all matching logs (without pagination)
   */
  async exportAuditLogs(params = {}) {
    return auditLogRepository.exportAll(params);
  }
};

export default auditService;
