import RailwayNode from '../models/RailwayNode.js';
import RailwayConnection from '../models/RailwayConnection.js';
import Sensor from '../models/Sensor.js';
import ComplianceRule from '../models/ComplianceRule.js';
import ComplianceViolation from '../models/ComplianceViolation.js';
import Incident from '../models/Incident.js';
import RiskScore from '../models/RiskScore.js';
import AuditLog from '../models/AuditLog.js';
import AgentAction from '../models/AgentAction.js';
import Mitigation from '../models/Mitigation.js';

export const reportService = {
  /**
   * 1. Infrastructure Report Data Compiler
   */
  async getInfrastructureData() {
    const nodes = await RailwayNode.find({});
    const connections = await RailwayConnection.find({}).populate('sourceNode targetNode');
    const sensors = await Sensor.find({});

    // Node Inventory
    const nodeInventory = nodes.map(n => ({
      code: n.nodeCode,
      name: n.nodeName,
      type: n.nodeType,
      region: n.region,
      status: n.status,
      coordinates: `${n.latitude}, ${n.longitude}`
    }));

    // Regional Breakdown
    const regionsMap = {};
    nodes.forEach(n => {
      const region = n.region || 'Unknown';
      if (!regionsMap[region]) {
        regionsMap[region] = { total: 0, active: 0, maintenance: 0, inactive: 0 };
      }
      regionsMap[region].total++;
      const statusLower = (n.status || '').toLowerCase();
      if (statusLower === 'active' || statusLower === 'healthy') {
        regionsMap[region].active++;
      } else if (statusLower === 'maintenance') {
        regionsMap[region].maintenance++;
      } else {
        regionsMap[region].inactive++;
      }
    });
    const regionalBreakdown = Object.keys(regionsMap).map(r => ({
      region: r,
      ...regionsMap[r]
    }));

    // Asset Health Summary
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let maintenanceCount = 0;
    nodes.forEach(n => {
      const statusLower = (n.status || '').toLowerCase();
      if (statusLower === 'healthy' || statusLower === 'active') healthyCount++;
      else if (statusLower === 'warning') warningCount++;
      else if (statusLower === 'critical' || statusLower === 'inactive') criticalCount++;
      else if (statusLower === 'maintenance') maintenanceCount++;
    });

    // Infrastructure Availability
    const totalNodes = nodes.length;
    const activeNodes = healthyCount + warningCount;
    const nodeAvailability = totalNodes > 0 ? ((activeNodes / totalNodes) * 100).toFixed(2) : '100.00';

    const totalConns = connections.length;
    const activeConns = connections.filter(c => ['active', 'Active'].includes(c.status)).length;
    const connectionAvailability = totalConns > 0 ? ((activeConns / totalConns) * 100).toFixed(2) : '100.00';

    // Capacity Utilization
    const mockConnectionLoads = {
      'DLI-GGN': 45, 'GGN-JP': 60, 'JP-AII': 55, 'AII-MJ': 50, 'MJ-ABR': 40,
      'ABR-PNU': 35, 'PNU-MSH': 48, 'MSH-ADI': 52, 'ADI-ND': 65, 'ND-ANND': 70,
      'ANND-BRC': 72, 'BRC-BH': 88, 'BH-ST': 78, 'ST-NVS': 68, 'NVS-BL': 62,
      'BL-VAPI': 58, 'VAPI-PLG': 75, 'PLG-MMCT': 82
    };

    const connectionLoads = connections.map(conn => {
      if (!conn.sourceNode || !conn.targetNode) return null;
      const key = `${conn.sourceNode.nodeCode}-${conn.targetNode.nodeCode}`;
      const revKey = `${conn.targetNode.nodeCode}-${conn.sourceNode.nodeCode}`;
      const load = mockConnectionLoads[key] || mockConnectionLoads[revKey] || 50;
      return {
        connection: `${conn.sourceNode.nodeCode} - ${conn.targetNode.nodeCode}`,
        name: `${conn.sourceNode.nodeName} to ${conn.targetNode.nodeName}`,
        distance: conn.distance,
        status: conn.status,
        load
      };
    }).filter(Boolean);

    const avgLoad = connectionLoads.length > 0
      ? (connectionLoads.reduce((sum, c) => sum + c.load, 0) / connectionLoads.length).toFixed(2)
      : '0.00';

    return {
      nodeInventory,
      regionalBreakdown,
      assetHealth: { healthy: healthyCount, warning: warningCount, critical: criticalCount, maintenance: maintenanceCount, total: totalNodes },
      availability: { nodes: nodeAvailability, connections: connectionAvailability },
      capacity: { connectionLoads, averageLoad: avgLoad },
      sensorsCount: sensors.length
    };
  },

  /**
   * 2. Compliance Report Data Compiler
   */
  async getComplianceData() {
    const rules = await ComplianceRule.find({});
    const violations = await ComplianceViolation.find({}).populate('nodeId').populate('ruleId');

    const standardsList = ['API617', 'RDSO', 'IEC-61850', 'UIC-714'];
    const totalRules = rules.length;
    const openViolations = violations.filter(v => v.status === 'Open' || v.status === 'Investigating');

    // Compliance Score
    const severityWeights = { Low: 5, Medium: 15, High: 30, Critical: 50 };
    const weightedDeduction = openViolations.reduce((sum, v) => sum + (severityWeights[v.severity] || 10), 0);
    const complianceScore = totalRules > 0
      ? Math.max(0, parseFloat((100 - (weightedDeduction / totalRules)).toFixed(2)))
      : 100;

    // Violations Summary
    const violationsSummary = {
      total: violations.length,
      open: violations.filter(v => v.status === 'Open').length,
      investigating: violations.filter(v => v.status === 'Investigating').length,
      resolved: violations.filter(v => v.status === 'Resolved').length
    };

    // Severity Distribution
    const severityDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    violations.forEach(v => {
      if (v.severity in severityDistribution) {
        severityDistribution[v.severity]++;
      }
    });

    // Standards & Rules Breakdown
    const standardsBreakdown = {};
    standardsList.forEach(std => {
      standardsBreakdown[std] = { rulesCount: 0, openViolations: 0, totalViolations: 0 };
    });
    standardsBreakdown['Other'] = { rulesCount: 0, openViolations: 0, totalViolations: 0 };

    rules.forEach(r => {
      const stdKey = standardsList.find(s => r.standard && r.standard.toUpperCase().includes(s.toUpperCase())) || 'Other';
      standardsBreakdown[stdKey].rulesCount++;
    });

    violations.forEach(v => {
      const std = v.ruleId?.standard;
      const stdKey = standardsList.find(s => std && std.toUpperCase().includes(s.toUpperCase())) || 'Other';
      standardsBreakdown[stdKey].totalViolations++;
      if (v.status === 'Open' || v.status === 'Investigating') {
        standardsBreakdown[stdKey].openViolations++;
      }
    });

    const rulesPerformance = rules.map(r => {
      const ruleViolations = violations.filter(v => v.ruleId?._id?.toString() === r._id?.toString());
      return {
        code: r.ruleCode,
        standard: r.standard,
        sensorType: r.sensorType,
        severity: r.severity,
        status: r.isActive ? 'Active' : 'Inactive',
        violationsCount: ruleViolations.length,
        openViolationsCount: ruleViolations.filter(v => v.status === 'Open' || v.status === 'Investigating').length,
        description: r.description
      };
    });

    const recentViolations = violations.map(v => ({
      id: v._id,
      ruleCode: v.ruleId?.ruleCode || 'N/A',
      standard: v.ruleId?.standard || 'N/A',
      nodeCode: v.nodeId?.nodeCode || 'N/A',
      nodeName: v.nodeId?.nodeName || 'N/A',
      sensorType: v.sensorType,
      actualValue: v.actualValue,
      expectedValue: v.expectedValue,
      severity: v.severity,
      status: v.status,
      createdAt: v.createdAt
    }));

    return {
      complianceScore,
      violationsSummary,
      severityDistribution,
      standardsBreakdown,
      rulesPerformance,
      recentViolations
    };
  },

  /**
   * 3. Incident Report Data Compiler
   */
  async getIncidentData() {
    const incidents = await Incident.find({}).populate('nodeId');

    const totalIncidents = incidents.length;
    const openIncidents = incidents.filter(i => ['Open', 'Investigating', 'Mitigating'].includes(i.status));
    const closedIncidents = incidents.filter(i => ['Resolved', 'Closed'].includes(i.status));
    const criticalIncidents = incidents.filter(i => i.severity === 'Critical');

    const severityDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    incidents.forEach(i => {
      if (i.severity in severityDistribution) {
        severityDistribution[i.severity]++;
      }
    });

    const resolutionRate = totalIncidents > 0
      ? ((closedIncidents.length / totalIncidents) * 100).toFixed(2)
      : '100.00';

    let totalResolutionTimeMs = 0;
    let closedCount = 0;
    closedIncidents.forEach(i => {
      const created = new Date(i.createdAt);
      const updated = new Date(i.updatedAt);
      const diffMs = updated - created;
      if (diffMs > 0) {
        totalResolutionTimeMs += diffMs;
        closedCount++;
      }
    });

    const meanResolutionTimeHours = closedCount > 0
      ? (totalResolutionTimeMs / (1000 * 60 * 60 * closedCount)).toFixed(2)
      : '0.00';

    const incidentList = incidents.map(i => ({
      id: i.incidentId,
      title: i.title,
      nodeCode: i.nodeId?.nodeCode || 'N/A',
      nodeName: i.nodeId?.nodeName || 'N/A',
      severity: i.severity,
      status: i.status,
      assignedTeam: i.assignedTeam || 'None',
      source: i.source,
      createdAt: i.createdAt,
      resolvedAt: ['Resolved', 'Closed'].includes(i.status) ? i.updatedAt : null
    }));

    return {
      summary: {
        total: totalIncidents,
        open: openIncidents.length,
        closed: closedIncidents.length,
        critical: criticalIncidents.length,
        resolutionRate
      },
      severityDistribution,
      meanResolutionTimeHours,
      incidentList
    };
  },

  /**
   * 4. Risk Analysis Report Data Compiler
   */
  async getRiskData() {
    const risks = await RiskScore.find({}).populate('nodeId');
    const riskAudits = await AuditLog.find({ module: 'Risk' }).sort({ createdAt: -1 }).limit(20);

    const totalRiskNodes = risks.length;
    const riskDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    risks.forEach(r => {
      if (r.riskLevel in riskDistribution) {
        riskDistribution[r.riskLevel]++;
      }
    });

    const topRiskAssets = risks
      .slice()
      .sort((a, b) => b.totalRisk - a.totalRisk)
      .slice(0, 10)
      .map(r => ({
        nodeCode: r.nodeId?.nodeCode || 'N/A',
        nodeName: r.nodeId?.nodeName || 'N/A',
        region: r.nodeId?.region || 'N/A',
        status: r.nodeId?.status || 'N/A',
        totalRisk: r.totalRisk,
        riskLevel: r.riskLevel
      }));

    const history = riskAudits.map(a => ({
      timestamp: a.timestamp || a.createdAt,
      action: a.action,
      description: a.description,
      severity: a.severity,
      nodeCode: a.metadata?.nodeCode || 'N/A',
      currentScore: a.metadata?.currentScore || a.metadata?.riskScore || 0,
      previousScore: a.metadata?.previousScore || 0
    }));

    const heatmapSummary = risks.map(r => ({
      nodeCode: r.nodeId?.nodeCode || 'N/A',
      nodeName: r.nodeId?.nodeName || 'N/A',
      thermalRisk: r.thermalRisk || 0,
      electricalRisk: r.electricalRisk || 0,
      structuralRisk: r.structuralRisk || 0,
      mechanicalRisk: r.mechanicalRisk || 0,
      signalingRisk: r.signalingRisk || 0,
      totalRisk: r.totalRisk || 0,
      riskLevel: r.riskLevel || 'Low'
    }));

    return {
      summary: {
        totalNodes: totalRiskNodes,
        distribution: riskDistribution
      },
      topRiskAssets,
      history,
      heatmapSummary
    };
  },

  /**
   * 5. Autonomous Actions Report Data Compiler
   */
  async getAgentData() {
    const agentActions = await AgentAction.find({}).populate('nodeId');
    const mitigations = await Mitigation.find({}).populate('nodeId');

    const totalActions = agentActions.length;
    const successActions = agentActions.filter(a => a.status === 'success');
    const pendingActions = agentActions.filter(a => a.status === 'pending');
    const failedActions = agentActions.filter(a => a.status === 'failed');

    const successRate = totalActions > 0
      ? ((successActions.length / totalActions) * 100).toFixed(2)
      : '100.00';

    const avgConfidence = totalActions > 0
      ? (agentActions.reduce((sum, a) => sum + (a.confidence || 0), 0) / totalActions).toFixed(2)
      : '0.00';

    const decisionsLog = agentActions.map(a => ({
      timestamp: a.executedAt || a.createdAt,
      nodeCode: a.nodeId?.nodeCode || 'N/A',
      nodeName: a.nodeId?.nodeName || 'N/A',
      threat: a.detectedThreat,
      severity: a.severity,
      decision: a.decision,
      confidence: a.confidence,
      status: a.status,
      reasoning: a.reasoning
    }));

    const mitigationsSummary = {
      total: mitigations.length,
      completed: mitigations.filter(m => ['Completed', 'Executed'].includes(m.status)).length,
      pending: mitigations.filter(m => m.status === 'Pending').length,
      failed: mitigations.filter(m => m.status === 'Failed').length,
      inProgress: mitigations.filter(m => m.status === 'InProgress').length
    };

    const mitigationsLog = mitigations.map(m => ({
      id: m.mitigationId,
      action: m.action,
      nodeCode: m.nodeId?.nodeCode || 'N/A',
      nodeName: m.nodeId?.nodeName || 'N/A',
      severity: m.severity,
      status: m.status,
      source: m.executionSource,
      outcome: m.executionNotes || 'None',
      startedAt: m.startedAt,
      completedAt: m.completedAt
    }));

    return {
      summary: {
        totalActions,
        success: successActions.length,
        pending: pendingActions.length,
        failed: failedActions.length,
        successRate,
        avgConfidence
      },
      decisionsLog,
      mitigationsSummary,
      mitigationsLog
    };
  }
};

export default reportService;
