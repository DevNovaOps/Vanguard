import ComplianceRule from '../models/ComplianceRule.js';
import ComplianceViolation from '../models/ComplianceViolation.js';
import RailwayNode from '../models/RailwayNode.js';
import { logAudit } from '../utils/auditLogger.js';
import incidentService from './incidentService.js';
import auditService from './auditService.js';
import webhookService from './webhookService.js';
import notificationService from './notificationService.js';

/**
 * Service handling Compliance Engine business logic
 */
export const complianceService = {
  /**
   * Get filtered, searched, paginated compliance rules
   */
  async getRules({ page = 1, limit = 10, search, sensorType, severity, isActive, standard, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const filter = {};

    // Apply filters
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    } else {
      // Default to active rules only, unless explicitly asked
      filter.isActive = true;
    }

    if (sensorType) filter.sensorType = sensorType;
    if (severity) filter.severity = severity;
    if (standard) filter.standard = standard;

    // Search query (ruleCode, standard, description)
    if (search) {
      filter.$or = [
        { ruleCode: { $regex: search, $options: 'i' } },
        { standard: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await ComplianceRule.countDocuments(filter);
    const rules = await ComplianceRule.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    return {
      rules,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  },

  /**
   * Get details of a single compliance rule by ID
   */
  async getRuleById(id) {
    return await ComplianceRule.findById(id);
  },

  /**
   * Create a new compliance rule
   */
  async createRule(ruleData, req) {
    const { ruleCode } = ruleData;
    const exists = await ComplianceRule.findOne({ ruleCode: ruleCode.toUpperCase() });
    if (exists) {
      const error = new Error(`Compliance Rule with code '${ruleCode.toUpperCase()}' already exists`);
      error.statusCode = 400;
      throw error;
    }

    const rule = await ComplianceRule.create(ruleData);

    // Write audit log
    await auditService.logEvent({
      req,
      module: 'Compliance',
      action: 'Rule Created',
      description: `Created new compliance rule: ${rule.ruleCode}`,
      severity: 'Info',
      metadata: { ruleId: rule._id, ruleCode: rule.ruleCode }
    });

    return rule;
  },

  /**
   * Update an existing compliance rule
   */
  async updateRule(id, updateData, req) {
    const rule = await ComplianceRule.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!rule) {
      const error = new Error('Compliance Rule not found');
      error.statusCode = 404;
      throw error;
    }

    // Write audit log
    await auditService.logEvent({
      req,
      module: 'Compliance',
      action: 'Rule Updated',
      description: `Updated compliance rule: ${rule.ruleCode}`,
      severity: 'Info',
      metadata: { ruleId: rule._id, ruleCode: rule.ruleCode, updateData }
    });

    return rule;
  },

  /**
   * Soft-delete a compliance rule (sets isActive to false)
   */
  async softDeleteRule(id, req) {
    const rule = await ComplianceRule.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!rule) {
      const error = new Error('Compliance Rule not found');
      error.statusCode = 404;
      throw error;
    }

    // Write audit log
    await auditService.logEvent({
      req,
      module: 'Compliance',
      action: 'Rule Deleted',
      description: `Soft deleted compliance rule: ${rule.ruleCode}`,
      severity: 'Warning',
      metadata: { ruleId: rule._id, ruleCode: rule.ruleCode }
    });

    return rule;
  },

  /**
   * Get filtered, paginated compliance violations
   */
  async getViolations({ page = 1, limit = 10, status, severity, sensorType, nodeId, ruleId, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const filter = {};

    // Apply filters
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (sensorType) filter.sensorType = sensorType;
    if (nodeId) filter.nodeId = nodeId;
    if (ruleId) filter.ruleId = ruleId;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await ComplianceViolation.countDocuments(filter);
    const violations = await ComplianceViolation.find(filter)
      .populate('ruleId', 'ruleCode standard description')
      .populate('nodeId', 'nodeCode nodeName status region')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    return {
      violations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  },

  /**
   * Get details of a single violation by ID
   */
  async getViolationById(id) {
    return await ComplianceViolation.findById(id)
      .populate('ruleId', 'ruleCode standard description minValue maxValue')
      .populate('nodeId', 'nodeCode nodeName latitude longitude status region');
  },

  /**
   * Aggregate statistics for the compliance dashboard
   */
  async getDashboardStats() {
    // 1. Rules aggregations
    const rulesTotal = await ComplianceRule.countDocuments({});
    const rulesActive = await ComplianceRule.countDocuments({ isActive: true });
    const rulesInactive = rulesTotal - rulesActive;

    // 2. Violations count by status
    const violationsTotal = await ComplianceViolation.countDocuments({});
    const violationsOpen = await ComplianceViolation.countDocuments({ status: 'Open' });
    const violationsInvestigating = await ComplianceViolation.countDocuments({ status: 'Investigating' });
    const violationsResolved = await ComplianceViolation.countDocuments({ status: 'Resolved' });

    // 3. Violations count by severity
    const severityStats = await ComplianceViolation.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const bySeverity = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    severityStats.forEach(stat => {
      if (stat._id in bySeverity) {
        bySeverity[stat._id] = stat.count;
      }
    });

    // 4. Violations count by sensorType
    const sensorStats = await ComplianceViolation.aggregate([
      { $group: { _id: '$sensorType', count: { $sum: 1 } } }
    ]);
    const bySensorType = {};
    sensorStats.forEach(stat => {
      bySensorType[stat._id] = stat.count;
    });

    // 5. Recent compliance violations (last 5)
    const recentViolations = await ComplianceViolation.find({})
      .populate('ruleId', 'ruleCode standard')
      .populate('nodeId', 'nodeCode nodeName')
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      rules: {
        total: rulesTotal,
        active: rulesActive,
        inactive: rulesInactive
      },
      violations: {
        total: violationsTotal,
        open: violationsOpen,
        investigating: violationsInvestigating,
        resolved: violationsResolved
      },
      bySeverity,
      bySensorType,
      recentViolations
    };
  },

  /**
   * Helper function for future telemetry integration:
   * Checks if a telemetry/sensor reading violates any active compliance rules.
   * If a violation is found, it automatically creates a ComplianceViolation document.
   */
  async evaluateReading({ nodeId, sensorType, value }) {
    // Check if node exists
    const node = await RailwayNode.findById(nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }

    // Find all active rules checking this sensorType
    const rules = await ComplianceRule.find({ sensorType, isActive: true });
    const violationsCreated = [];

    for (const rule of rules) {
      let violated = false;

      // Check minimum threshold
      if (rule.minValue !== null && value < rule.minValue) {
        violated = true;
      }
      // Check maximum threshold
      if (rule.maxValue !== null && value > rule.maxValue) {
        violated = true;
      }

      if (violated) {
        // Prevent duplicate Open/Investigating violations for the same node and rule
        const existingViolation = await ComplianceViolation.findOne({
          nodeId,
          ruleId: rule._id,
          status: { $in: ['Open', 'Investigating'] }
        });

        if (!existingViolation) {
          const violation = await ComplianceViolation.create({
            ruleId: rule._id,
            nodeId,
            sensorType,
            actualValue: value,
            expectedValue: rule.minValue !== null && value < rule.minValue ? rule.minValue : rule.maxValue,
            severity: rule.severity,
            status: 'Open'
          });
          violationsCreated.push(violation);

          // Trigger Notification
          const notifSeverity = rule.severity === 'Critical' ? 'Critical' : (rule.severity === 'High' ? 'High' : (rule.severity === 'Medium' ? 'Warning' : 'Info'));
          try {
            await notificationService.createNotification({
              title: `Compliance Violation: ${rule.ruleCode} at ${node.nodeName}`,
              message: `Compliance Violation detected on sensor ${sensorType} for rule ${rule.ruleCode} (${rule.standard}). Actual value ${value} is outside target limit.`,
              type: 'ComplianceViolation',
              severity: notifSeverity,
              module: 'Compliance',
              recipientRoles: ['SafetyOfficer'],
              metadata: { violationId: violation._id, nodeId: node._id, ruleCode: rule.ruleCode }
            });
          } catch (notifErr) {
            console.error(`[COMPLIANCE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
          }

          // Log Compliance Violation
          await auditService.logComplianceViolation(null, {
            _id: violation._id,
            nodeId,
            actualValue: value,
            severity: rule.severity,
            ruleId: { ruleCode: rule.ruleCode }
          });

          // Trigger Webhook Event
          try {
            await webhookService.triggerEvent('COMPLIANCE_VIOLATION', {
              violationId: violation._id,
              ruleCode: rule.ruleCode,
              nodeId,
              sensorType,
              actualValue: value,
              expectedValue: rule.minValue !== null && value < rule.minValue ? rule.minValue : rule.maxValue,
              severity: rule.severity
            });
          } catch (webErr) {
            console.error(`[COMPLIANCE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
          }

          // Calculate risk score based on rule severity
          let riskScore = 25;
          if (rule.severity === 'Medium') riskScore = 50;
          else if (rule.severity === 'High') riskScore = 75;
          else if (rule.severity === 'Critical') riskScore = 95;

          try {
            await incidentService.createIncident({
              nodeId,
              riskScore,
              title: `Compliance Breach: ${rule.ruleCode} at ${node.nodeName}`,
              description: `Compliance Violation detected on sensor ${sensorType} for rule ${rule.ruleCode} (${rule.standard}). Actual value ${value} is outside target limit.`,
              source: 'Compliance',
              status: 'Open'
            });
          } catch (err) {
            console.error(`[COMPLIANCE-INCIDENT-TRIGGER-ERROR] Failed to trigger incident: ${err.message}`);
          }
        }
      }
    }

    // Log general Compliance Validation if no violations were created
    if (violationsCreated.length === 0) {
      await auditService.logEvent({
        req: null,
        action: 'Compliance Validation',
        module: 'Compliance',
        description: `Compliance validation passed for sensor ${sensorType} at node ${node.nodeName}. Value: ${value}`,
        severity: 'Info',
        metadata: { nodeId, sensorType, value }
      });
    }

    return violationsCreated;
  }
};

export default complianceService;
