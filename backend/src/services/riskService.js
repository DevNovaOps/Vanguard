import incidentService from './incidentService.js';
import RailwayNode from '../models/RailwayNode.js';
import { logAudit } from '../utils/auditLogger.js';

export const riskService = {
  /**
   * Evaluate risk score for a transit node based on current readings or updates.
   * If risk exceeds threshold (High/Critical), automatically triggers incident creation.
   * Medium risk can optionally trigger incidents if specified.
   */
  async evaluateNodeRisk({ nodeId, riskScore, reason, triggerMediumIncident = false, req }) {
    const node = await RailwayNode.findById(nodeId);
    if (!node) {
      throw new Error(`Railway Node with ID ${nodeId} not found`);
    }

    // Determine if we should trigger an incident
    // Low: 0-30 -> No incident
    // Medium: 31-60 -> Optional (triggered if triggerMediumIncident is true)
    // High: 61-80 -> Create incident
    // Critical: 81-100 -> Create incident
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

    // Log the risk calculation in audit logs
    await logAudit({
      req,
      module: 'Compliance', // Mapping to Compliance/Risk modules in audit logs
      action: 'Risk Recalculation',
      description: `Risk score for node ${node.nodeName} calculated as ${riskScore}/100`,
      metadata: { nodeId, riskScore, severity }
    });

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

    return {
      nodeId,
      riskScore,
      severity,
      incidentCreated: !!incident,
      incident
    };
  }
};

export default riskService;
