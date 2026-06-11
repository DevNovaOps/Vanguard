import AuditLog from '../models/AuditLog.js';
import { getIO } from '../config/socket.js';

export const auditService = {
  /**
   * Core logging function
   */
  async logEvent(params = {}) {
    const {
      req,
      userId,
      username,
      role,
      action,
      module,
      entityType,
      entityId,
      description,
      severity = 'Info',
      metadata = {}
    } = params;

    try {
      let resolvedUserId = userId || null;
      let resolvedUsername = username || 'System';
      let resolvedRole = role || 'System';
      let ipAddress = params.ipAddress || null;
      let userAgent = params.userAgent || null;

      // Resolve details from request object if present
      if (req) {
        if (req.user) {
          resolvedUserId = req.user._id;
          resolvedUsername = req.user.name || req.user.email || resolvedUsername;
          resolvedRole = req.user.role || resolvedRole;
        }
        ipAddress = ipAddress || req.ip || (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || null;
        userAgent = userAgent || (req.headers && req.headers['user-agent']) || null;
      }

      // Create audit log entry
      const log = await AuditLog.create({
        userId: resolvedUserId,
        username: resolvedUsername,
        role: resolvedRole,
        action,
        module,
        entityType,
        entityId,
        description,
        severity,
        metadata,
        ipAddress,
        userAgent
      });

      console.log(`[AUDIT-LOG] Recorded event: ${action} in module ${module} (${severity})`);

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
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      module,
      action,
      severity,
      userId,
      username,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = params;

    const filter = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (module && module !== 'all') {
      filter.module = module;
    }
    if (action) {
      filter.action = action;
    }
    if (severity && severity !== 'all') {
      filter.severity = severity;
    }
    if (userId) {
      filter.userId = userId;
    }
    if (username) {
      filter.username = username;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { action: searchRegex },
        { module: searchRegex },
        { description: searchRegex },
        { username: searchRegex },
        { severity: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    return {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  },

  /**
   * Dashboard statistics aggregations
   */
  async getAuditStatistics() {
    const totalLogs = await AuditLog.countDocuments({});
    const criticalEvents = await AuditLog.countDocuments({ severity: 'Critical' });
    const warningEvents = await AuditLog.countDocuments({ severity: 'Warning' });
    const infoEvents = await AuditLog.countDocuments({ severity: 'Info' });

    // simulationsTriggered: count of audit logs in module 'Simulation' with action 'Simulation Started'
    const simulationsTriggered = await AuditLog.countDocuments({
      module: 'Simulation',
      action: 'Simulation Started'
    });

    // incidentsCreated: count of audit logs with action 'Incident Created'
    const incidentsCreated = await AuditLog.countDocuments({
      module: 'Incident',
      action: 'Incident Created'
    });

    // agentActions: count of audit logs in module 'AutonomousAgent'
    const agentActions = await AuditLog.countDocuments({
      module: 'AutonomousAgent'
    });

    return {
      totalLogs,
      criticalEvents,
      warningEvents,
      infoEvents,
      simulationsTriggered,
      incidentsCreated,
      agentActions
    };
  },

  /**
   * Export all matching logs (without pagination)
   */
  async exportAuditLogs(params = {}) {
    const {
      startDate,
      endDate,
      module,
      action,
      severity,
      userId,
      username,
      search
    } = params;

    const filter = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    if (module && module !== 'all') {
      filter.module = module;
    }
    if (action) {
      filter.action = action;
    }
    if (severity && severity !== 'all') {
      filter.severity = severity;
    }
    if (userId) {
      filter.userId = userId;
    }
    if (username) {
      filter.username = username;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { action: searchRegex },
        { module: searchRegex },
        { description: searchRegex },
        { username: searchRegex },
        { severity: searchRegex }
      ];
    }

    return await AuditLog.find(filter).sort({ timestamp: -1 });
  }
};

export default auditService;
