import complianceRepository from '../repositories/complianceRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
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
  async getRules(filters = {}) {
    return await complianceRepository.findAllRules(filters);
  },

  /**
   * Get details of a single compliance rule by ID
   */
  async getRuleById(id) {
    return await complianceRepository.findRuleById(id);
  },

  /**
   * Create a new compliance rule
   */
  async createRule(ruleData, req) {
    const { ruleCode } = ruleData;
    const exists = await complianceRepository.findRuleByCode(ruleCode.toUpperCase());
    if (exists) {
      const error = new Error(`Compliance Rule with code '${ruleCode.toUpperCase()}' already exists`);
      error.statusCode = 400;
      throw error;
    }

    const rule = await complianceRepository.createRule(ruleData);

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
    const rule = await complianceRepository.updateRule(id, updateData);

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
    const rule = await complianceRepository.softDeleteRule(id);

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
  async getViolations(filters = {}) {
    return await complianceRepository.findAllViolations(filters);
  },

  /**
   * Get details of a single violation by ID
   */
  async getViolationById(id) {
    return await complianceRepository.findViolationById(id);
  },

  /**
   * Aggregate statistics for the compliance dashboard
   */
  async getDashboardStats() {
    return await complianceRepository.getDashboardStats();
  },

  /**
   * Helper function for future telemetry integration:
   * Checks if a telemetry/sensor reading violates any active compliance rules.
   * If a violation is found, it automatically creates a ComplianceViolation document.
   */
  async evaluateReading({ nodeId, sensorType, value }) {
    // Check if node exists
    const node = await railwayNodeRepository.findById(nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }

    // Find all active rules checking this sensorType
    const { rules } = await complianceRepository.findAllRules({ sensorType, isActive: true, limit: 1000 });
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
        const { violations: existingViolations } = await complianceRepository.findAllViolations({
          nodeId,
          ruleId: rule._id,
          status: 'Open',
          limit: 1
        });
        const { violations: existingInvestigating } = await complianceRepository.findAllViolations({
          nodeId,
          ruleId: rule._id,
          status: 'Investigating',
          limit: 1
        });

        if (existingViolations.length === 0 && existingInvestigating.length === 0) {
          const violation = await complianceRepository.createViolation({
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
            await notificationService.create({
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
