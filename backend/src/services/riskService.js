import riskScoreRepository from '../repositories/riskScoreRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
import { logAudit } from '../utils/auditLogger.js';
import incidentService from './incidentService.js';
import auditService from './auditService.js';
import webhookService from './webhookService.js';
import notificationService from './notificationService.js';

export const riskService = {
  /**
   * Evaluate risk score for a transit node based on current readings or updates.
   * If risk exceeds threshold (High/Critical), automatically triggers incident creation.
   * Medium risk can optionally trigger incidents if specified.
   */
  async evaluateNodeRisk({ nodeId, riskScore, reason, triggerMediumIncident = false, req }) {
    const node = await railwayNodeRepository.findById(nodeId);
    if (!node) {
      throw new Error(`Railway Node with ID ${nodeId} not found`);
    }

    // Retrieve previous risk scores to determine changes
    const previousRiskRecord = await riskScoreRepository.findByNodeId(nodeId);
    const previousScore = previousRiskRecord ? previousRiskRecord.totalRisk : 0;
    const previousLevel = previousRiskRecord ? previousRiskRecord.riskLevel : 'Low';

    // Determine if we should trigger an incident
    let shouldCreateIncident = false;
    let severity = 'Low';

    if (riskScore > 30 && riskScore <= 60) {
      severity = 'Medium';
      shouldCreateIncident = triggerMediumIncident;
    } else if (riskScore > 60 && riskScore <= 80) {
      severity = 'High';
      shouldCreateIncident = true;
    } else if (riskScore > 80) {
      severity = 'Critical';
      shouldCreateIncident = true;
    }

    console.log(`[RISK-ENGINE] Node ${node.nodeName} evaluated. Risk score: ${riskScore} (${severity}). Trigger incident: ${shouldCreateIncident}`);

    // 1. Log Risk Calculation
    await auditService.logRiskCalculation(req, {
      nodeId,
      nodeName: node.nodeName,
      previousScore,
      currentScore: riskScore,
      riskLevel: severity
    });

    // 2. Log Risk Level Changed if applicable
    if (previousLevel !== severity) {
      await auditService.logEvent({
        req,
        module: 'Risk',
        action: 'Risk Level Changed',
        description: `Risk level for node ${node.nodeName} changed from ${previousLevel} to ${severity}`,
        severity: severity === 'Critical' ? 'Critical' : (severity === 'High' ? 'Warning' : 'Info'),
        metadata: { nodeId, nodeName: node.nodeName, previousLevel, currentLevel: severity, previousScore, currentScore: riskScore }
      });

      // Trigger Webhook Event
      try {
        await webhookService.triggerEvent('RISK_LEVEL_CHANGED', {
          nodeId,
          nodeName: node.nodeName,
          previousLevel,
          currentLevel: severity,
          previousScore,
          currentScore: riskScore
        }, req);
      } catch (webErr) {
        console.error(`[RISK-LEVEL-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
      }
    }

    // 3. Log Risk Threshold Breached if applicable
    const wasSafe = previousLevel === 'Low' || previousLevel === 'Medium';
    const isDangerous = severity === 'High' || severity === 'Critical';
    if (wasSafe && isDangerous) {
      await auditService.logEvent({
        req,
        module: 'Risk',
        action: 'Risk Threshold Breached',
        description: `Safety risk threshold breached at node ${node.nodeName}! Current score: ${riskScore}/100 (${severity})`,
        severity: severity === 'Critical' ? 'Critical' : 'Warning',
        metadata: { nodeId, nodeName: node.nodeName, previousScore, currentScore: riskScore, riskLevel: severity }
      });

      // Trigger Webhook Event
      try {
        await webhookService.triggerEvent('RISK_THRESHOLD_EXCEEDED', {
          nodeId,
          nodeName: node.nodeName,
          previousScore,
          currentScore: riskScore,
          riskLevel: severity
        }, req);
      } catch (webErr) {
        console.error(`[RISK-THRESHOLD-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
      }
    }

    let incident = null;
    if (shouldCreateIncident) {
      // Create or update the incident
      incident = await incidentService.createIncident({
        nodeId,
        riskScore,
        title: `${severity} Risk Breach: ${node.nodeName}`,
        description: reason || `Node ${node.nodeName} reached a risk score of ${riskScore} which exceeds safety thresholds.`,
        source: 'Telemetry',
        status: 'Open'
      }, req);
    }

    // Trigger Risk Alert notification if risk score exceeds 30
    if (riskScore > 30) {
      const notifSeverity = severity === 'Critical' ? 'Critical' : (severity === 'High' ? 'High' : 'Warning');
      try {
        await notificationService.create({
          title: `Risk Alert: Elevated Risk at ${node.nodeName}`,
          message: `Risk level for node ${node.nodeName} is now classified as ${severity} with a score of ${riskScore}/100. Reason: ${reason || 'Recalculation threshold breach.'}`,
          type: 'RiskAlert',
          severity: notifSeverity,
          module: 'Risk',
          recipientRoles: ['SafetyOfficer'],
          metadata: { nodeId: node._id, nodeName: node.nodeName, riskScore, riskLevel: severity }
        });
      } catch (notifErr) {
        console.error(`[RISK-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }
    }

    return {
      nodeId,
      riskScore,
      severity,
      incidentCreated: !!incident,
      incident
    };
  },

  /**
   * Helper to calculate mock/fallback risk for a node based on status
   */
  generateFallbackRisk(node) {
    const status = node.status?.toLowerCase() || 'active';
    let temp, vibration, gas, power;

    if (status === 'critical') {
      temp = 80 + Math.random() * 15;
      vibration = 7.0 + Math.random() * 2.5;
      gas = 38 + Math.random() * 10;
      power = 23 + Math.random() * 3;
    } else if (status === 'warning') {
      temp = 55 + Math.random() * 15;
      vibration = 4.5 + Math.random() * 2.0;
      gas = 22 + Math.random() * 10;
      power = 20 + Math.random() * 3;
    } else {
      temp = 30 + Math.random() * 15;
      vibration = 1.2 + Math.random() * 1.5;
      gas = 6 + Math.random() * 8;
      power = 18 + Math.random() * 3;
    }

    const thermalRisk = Math.min(100, Math.max(0, Math.round((temp / 120) * 100)));
    const structuralRisk = Math.min(100, Math.max(0, Math.round((vibration / 15) * 100)));
    const mechanicalRisk = Math.min(100, Math.max(0, Math.round((gas / 50) * 100)));
    const electricalRisk = Math.min(100, Math.max(0, Math.round((power / 27) * 100)));

    const signalingRisk = Math.min(
      100,
      Math.max(
        0,
        status === 'critical'
          ? Math.round(80 + Math.random() * 15)
          : status === 'warning'
            ? Math.round(50 + Math.random() * 15)
            : Math.round(10 + Math.random() * 15)
      )
    );

    const totalRisk = Math.round(
      thermalRisk * 0.3 + structuralRisk * 0.3 + mechanicalRisk * 0.2 + electricalRisk * 0.2
    );

    let riskLevel = 'Low';
    if (totalRisk > 80) riskLevel = 'Critical';
    else if (totalRisk > 60) riskLevel = 'High';
    else if (totalRisk > 30) riskLevel = 'Medium';

    return {
      thermalRisk,
      structuralRisk,
      mechanicalRisk,
      electricalRisk,
      signalingRisk,
      totalRisk,
      riskLevel
    };
  },

  /**
   * Recalculate risk scores for all nodes
   */
  async calculateAllRisks(req) {
    const nodes = await railwayNodeRepository.findAll();
    let count = 0;

    for (const node of nodes) {
      const riskData = this.generateFallbackRisk(node);
      const existing = await riskScoreRepository.findByNodeId(node._id);
      if (existing) {
        await riskScoreRepository.update(existing._id, riskData);
      } else {
        await riskScoreRepository.create({ nodeId: node._id, ...riskData });
      }
      count++;
    }

    // Record audit log
    await auditService.logEvent({
      req,
      module: 'Risk',
      action: 'Risk Calculation',
      description: `Triggered global risk scores recalculation for ${count} nodes`,
      severity: 'Info',
      metadata: { count }
    });

    // Trigger global risk calculation notification
    try {
      await notificationService.create({
        title: 'Global Risk Recalculation Completed',
        message: `Global risk score recalculation completed for ${count} nodes.`,
        type: 'RiskAlert',
        severity: 'Info',
        module: 'Risk',
        recipientRoles: ['SafetyOfficer'],
        metadata: { count }
      });
    } catch (notifErr) {
      console.error(`[RISK-GLOBAL-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
    }

    return count;
  },

  /**
   * Fetch all calculated risks with populated node details
   */
  async getRisks() {
    return await riskScoreRepository.findAll();
  },

  /**
   * Get risk for a specific nodeId
   */
  async getRiskByNodeId(nodeId) {
    let risk = await riskScoreRepository.findByNodeId(nodeId);
    if (!risk) {
      const node = await railwayNodeRepository.findById(nodeId);
      if (!node) {
        throw new Error('Railway Node not found');
      }
      const riskData = this.generateFallbackRisk(node);
      risk = await riskScoreRepository.create({
        nodeId: node._id,
        ...riskData
      });
    }
    return risk;
  },

  /**
   * Fetch aggregated risk analysis metrics for the executive dashboard
   */
  async getDashboardStats() {
    return await riskScoreRepository.getDashboardStats();
  }
};

export default riskService;
