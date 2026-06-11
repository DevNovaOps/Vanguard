import AgentAction from '../models/AgentAction.js';
import RailwayNode from '../models/RailwayNode.js';
import Incident from '../models/Incident.js';
import mitigationService from './mitigationService.js';
import { logAudit } from '../utils/auditLogger.js';
import auditService from './auditService.js';

export const aiAgentService = {
  /**
   * Evaluates telemetry input and executes a rule-based decision
   */
  async evaluateTelemetry(telemetry, req) {
    const { temperature, vibration, gas, power, riskScore, nodeId } = telemetry;

    // Validate if node exists
    const nodeExists = await RailwayNode.findById(nodeId);
    if (!nodeExists) {
      throw new Error('Railway Node not found');
    }

    // Identify violations
    const violations = [];
    if (temperature > 90) violations.push('Temperature');
    if (gas > 70) violations.push('Gas');
    if (vibration > 80) violations.push('Vibration');
    if (riskScore > 85) violations.push('Risk Score');

    let decision = '';
    let confidence = 0;
    let reasoning = '';
    let severity = 'Low';
    let detectedThreat = 'None';

    // 1. Multiple Violations Check
    if (violations.length >= 2) {
      decision = 'Escalate To Safety Officer';
      confidence = 95;
      reasoning = `Multiple telemetry violations detected simultaneously: ${violations.join(', ')}`;
      severity = 'Critical';
      detectedThreat = 'Multiple Violations';
    } 
    // 2. Individual Rules Check
    else if (temperature > 90) {
      decision = 'Shutdown System';
      confidence = 98;
      reasoning = `Critical thermal threshold exceeded: Temperature is ${temperature}°C (safety threshold: 90°C)`;
      severity = 'Critical';
      detectedThreat = 'Thermal Anomaly';
    } else if (gas > 70) {
      decision = 'Emergency Brake';
      confidence = 95;
      reasoning = `Hazardous gas levels detected: Gas is ${gas} ppm (safety threshold: 70 ppm)`;
      severity = 'Critical';
      detectedThreat = 'Gas Anomaly';
    } else if (vibration > 80) {
      decision = 'Maintenance Alert';
      confidence = 92;
      reasoning = `Abnormal vibration levels detected: Vibration is ${vibration} mm/s (safety threshold: 80 mm/s)`;
      severity = 'High';
      detectedThreat = 'Vibration Anomaly';
    } else if (riskScore > 85) {
      decision = 'Critical Infrastructure Isolation';
      confidence = 96;
      reasoning = `High risk level detected: Risk score is ${riskScore}/100 (safety threshold: 85)`;
      severity = 'Critical';
      detectedThreat = 'Risk Score Anomaly';
    } 
    // 3. Normal State Check
    else {
      decision = 'Keep Monitoring';
      confidence = 99;
      reasoning = 'All telemetry parameters are within safe operational limits';
      severity = 'Low';
      detectedThreat = 'None';
    }

    // Create Agent Action record
    const action = await AgentAction.create({
      nodeId,
      telemetryData: { temperature, vibration, gas, power, riskScore },
      detectedThreat,
      severity,
      decision,
      confidence,
      reasoning,
      status: 'success',
      executedAt: new Date()
    });

    // Populate node details for response consistency
    const populatedAction = await AgentAction.findById(action._id).populate('nodeId', 'nodeCode nodeName status region');

    // Automatic Mitigation Trigger
    const mitigationDecisionMap = {
      'Shutdown System': 'Infrastructure Shutdown',
      'Emergency Brake': 'Emergency Brake',
      'Maintenance Alert': 'Maintenance Dispatch',
      'Critical Infrastructure Isolation': 'Route Isolation',
      'Critical Isolation': 'Route Isolation'
    };

    if (mitigationDecisionMap[decision]) {
      try {
        // Find an active Open/Investigating incident for this node or create one
        let incident = await Incident.findOne({ nodeId, status: { $in: ['Open', 'Investigating', 'Mitigating'] } });
        if (!incident) {
          incident = await Incident.create({
            nodeId,
            riskScore: riskScore || 50,
            severity: severity || 'High',
            title: `AI Agent Decision: ${decision}`,
            description: reasoning || `AI Agent evaluated telemetry at node ${nodeExists.nodeName}: ${decision}`,
            status: 'Open',
            source: 'Agent'
          });
          console.log(`[AI-AGENT] Automatically created incident ${incident.incidentId} for mitigation mapping.`);
        }

        const mappedAction = mitigationDecisionMap[decision];
        await mitigationService.createMitigation({
          incidentId: incident._id,
          nodeId,
          action: mappedAction,
          severity: severity || 'High',
          executionSource: 'AI_AGENT',
          executionNotes: `Automatically triggered by AI Agent Decision: ${decision}. Reasoning: ${reasoning}`,
          agentActionId: action._id
        }, req);
      } catch (mitgErr) {
        console.error(`[AI-AGENT-MITIGATION-ERROR] Failed to auto-trigger mitigation: ${mitgErr.message}`);
      }
    }

    // Log Threat Detected if a threat was found
    if (detectedThreat !== 'None') {
      await auditService.logEvent({
        req,
        module: 'AutonomousAgent',
        action: 'Threat Detected',
        description: `Threat detected by AI Agent: ${detectedThreat} at node ${nodeExists.nodeName}`,
        severity: severity === 'Critical' ? 'Critical' : 'Warning',
        metadata: { nodeId, detectedThreat, telemetry }
      });
    }

    // Log Severity Classified
    await auditService.logEvent({
      req,
      module: 'AutonomousAgent',
      action: 'Severity Classified',
      description: `AI Agent classified threat severity as ${severity} for node ${nodeExists.nodeName}`,
      severity: severity === 'Critical' ? 'Critical' : (severity === 'High' ? 'Warning' : 'Info'),
      metadata: { nodeId, severity, detectedThreat }
    });

    // Log Plan Generated
    if (decision !== 'Keep Monitoring') {
      await auditService.logEvent({
        req,
        module: 'AutonomousAgent',
        action: 'Plan Generated',
        description: `Mitigation plan generated by AI Agent: ${decision}. Reasoning: ${reasoning}`,
        severity: 'Info',
        metadata: { nodeId, decision, confidence, reasoning }
      });

      // Log Action Executed since we mapped and triggered the action
      await auditService.logEvent({
        req,
        module: 'AutonomousAgent',
        action: 'Action Executed',
        description: `AI Agent executed action: ${decision}`,
        severity: 'Info',
        metadata: { nodeId, decision, actionId: action._id }
      });
    }

    // Create central Agent Decision Audit Log
    await auditService.logAgentDecision(req, populatedAction);

    return populatedAction;
  },

  /**
   * Retrieves all historical agent actions
   */
  async getActions() {
    return await AgentAction.find({})
      .populate('nodeId', 'nodeCode nodeName status region')
      .sort({ createdAt: -1 });
  },

  /**
   * Retrieves an action by ID
   */
  async getActionById(id) {
    const action = await AgentAction.findById(id).populate('nodeId', 'nodeCode nodeName status region');
    if (!action) {
      throw new Error('Agent Action not found');
    }
    return action;
  },

  /**
   * Compiles dashboard statistics for executive summaries
   */
  async getDashboardStats() {
    const totalActions = await AgentAction.countDocuments({});
    const activeActions = await AgentAction.countDocuments({ status: 'pending' });
    const criticalActions = await AgentAction.countDocuments({ severity: 'Critical' });
    const failedActions = await AgentAction.countDocuments({ status: 'failed' });

    // Calculate Average Confidence
    const confidenceStats = await AgentAction.aggregate([
      { $group: { _id: null, avgConf: { $avg: '$confidence' } } }
    ]);
    const averageConfidence = confidenceStats.length ? parseFloat(confidenceStats[0].avgConf.toFixed(1)) : 0;

    // Calculate Success Rate
    const successRate = totalActions ? parseFloat(((totalActions - failedActions) / totalActions * 100).toFixed(1)) : 100;

    // Retrieve latest decision
    const latestAction = await AgentAction.findOne({}).sort({ createdAt: -1 });
    const latestDecision = latestAction ? latestAction.decision : 'None';

    return {
      totalActions,
      activeActions,
      criticalActions,
      averageConfidence,
      successRate,
      latestDecision
    };
  }
};

export default aiAgentService;
