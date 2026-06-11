


import RiskScore from '../models/RiskScore.js';
import RailwayNode from '../models/RailwayNode.js';
import { logAudit } from '../utils/auditLogger.js';
import incidentService from './incidentService.js';

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
  },

  /**
   * Helper to calculate mock/fallback risk for a node based on status
   */
  generateFallbackRisk(node) {
    const status = node.status?.toLowerCase() || 'active';
    let temp, vibration, gas, power;

    if (status === 'critical') {
      temp = 80 + Math.random() * 15; // 80 - 95 °C (Threshold 120)
      vibration = 7.0 + Math.random() * 2.5; // 7.0 - 9.5 mm/s (Threshold 15)
      gas = 38 + Math.random() * 10; // 38 - 48 ppm (Threshold 50)
      power = 23 + Math.random() * 3; // 23 - 26 kV (Threshold 27)
    } else if (status === 'warning') {
      temp = 55 + Math.random() * 15; // 55 - 70 °C
      vibration = 4.5 + Math.random() * 2.0; // 4.5 - 6.5 mm/s
      gas = 22 + Math.random() * 10; // 22 - 32 ppm
      power = 20 + Math.random() * 3; // 20 - 23 kV
    } else {
      // Normal/Healthy
      temp = 30 + Math.random() * 15; // 30 - 45 °C
      vibration = 1.2 + Math.random() * 1.5; // 1.2 - 2.7 mm/s
      gas = 6 + Math.random() * 8; // 6 - 14 ppm
      power = 18 + Math.random() * 3; // 18 - 21 kV
    }

    // Convert raw telemetry inputs into 0-100 scale component percentages
    const thermalRisk = Math.min(100, Math.max(0, Math.round((temp / 120) * 100)));
    const structuralRisk = Math.min(100, Math.max(0, Math.round((vibration / 15) * 100)));
    const mechanicalRisk = Math.min(100, Math.max(0, Math.round((gas / 50) * 100)));
    const electricalRisk = Math.min(100, Math.max(0, Math.round((power / 27) * 100)));

    // Signaling risk based on status
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

    // totalRisk weighted average formula
    const totalRisk = Math.round(
      thermalRisk * 0.3 + structuralRisk * 0.3 + mechanicalRisk * 0.2 + electricalRisk * 0.2
    );

    // Map risk levels
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
    const nodes = await RailwayNode.find({});
    let count = 0;

    for (const node of nodes) {
      // Structure ready for future live Telemetry query if required
      const riskData = this.generateFallbackRisk(node);

      await RiskScore.findOneAndUpdate(
        { nodeId: node._id },
        {
          ...riskData,
          calculatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      count++;
    }

    // Record audit log
    await logAudit({
      req,
      module: 'Mitigation', // Using allowed audit module from AuditLog schema
      action: 'RISK_RECALCULATION',
      description: `Triggered global risk scores recalculation for ${count} nodes`,
      metadata: { count }
    });

    return count;
  },

  /**
   * Fetch all calculated risks with populated node details
   */
  async getRisks() {
    return await RiskScore.find({}).populate('nodeId', 'nodeCode nodeName status region');
  },

  /**
   * Get risk for a specific nodeId
   */
  async getRiskByNodeId(nodeId) {
    const risk = await RiskScore.findOne({ nodeId }).populate('nodeId', 'nodeCode nodeName status region');
    if (!risk) {
      // If none exists, fetch node, calculate on the fly, and return it
      const node = await RailwayNode.findById(nodeId);
      if (!node) {
        throw new Error('Railway Node not found');
      }
      const riskData = this.generateFallbackRisk(node);
      return await RiskScore.create({
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
    const risks = await RiskScore.find({}).populate('nodeId', 'nodeCode nodeName');
    
    const totalNodes = risks.length;
    if (totalNodes === 0) {
      return {
        totalNodes: 0,
        averageRisk: 0,
        highestRiskNode: null,
        criticalNodes: 0,
        riskDistribution: { Low: 0, Medium: 0, High: 0, Critical: 0 }
      };
    }

    // Calculations
    const sumRisk = risks.reduce((sum, r) => sum + r.totalRisk, 0);
    const averageRisk = parseFloat((sumRisk / totalNodes).toFixed(1));

    // Highest risk node lookup
    let highestRiskNode = null;
    let maxRisk = -1;
    risks.forEach(r => {
      if (r.totalRisk > maxRisk) {
        maxRisk = r.totalRisk;
        highestRiskNode = {
          nodeId: r.nodeId?._id || r.nodeId,
          nodeName: r.nodeId?.nodeName || 'Unknown',
          totalRisk: r.totalRisk
        };
      }
    });

    const criticalNodes = risks.filter(r => r.riskLevel === 'Critical').length;

    const riskDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    risks.forEach(r => {
      if (r.riskLevel in riskDistribution) {
        riskDistribution[r.riskLevel]++;
      }
    });

    return {
      totalNodes,
      averageRisk,
      highestRiskNode,
      criticalNodes,
      riskDistribution
    };
  }
};

export default riskService;
