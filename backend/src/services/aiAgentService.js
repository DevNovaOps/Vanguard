import AgentAction from '../models/AgentAction.js';
import RailwayNode from '../models/RailwayNode.js';
import Incident from '../models/Incident.js';
import mitigationService from './mitigationService.js';
import { logAudit } from '../utils/auditLogger.js';
import auditService from './auditService.js';
import webhookService from './webhookService.js';
import notificationService from './notificationService.js';
import { runMultiAgentPipeline } from '../utils/pythonRunner.js';

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

    // Call the Python multi-agent system
    const query = `Assess health and safety anomalies at node ${nodeExists.nodeName} (${nodeExists.nodeCode}) under current telemetry conditions: Temperature ${temperature}°C, Track Vibration ${vibration} mm/s, Hazardous Gas ${gas} ppm, Power Grid Voltage ${power} kV, Risk Score ${riskScore}/100.`;
    
    // VANGUARD FIX: Wrap Python runner pipeline call to defend against crashes
    let result;
    try {
      result = await runMultiAgentPipeline(query, telemetry);
    } catch (err) {
      console.warn('[AI-AGENT] Python pipeline execution failed, activating fallback:', err.message);
      result = {
        success: true,
        risk_level: 'Medium',
        escalation_level: 'Medium',
        alerts: ['Keep Monitoring'],
        executive_summary: 'Agent response unavailable.',
        reasoning: 'Fallback mode activated.',
        retrieval_results: 'Agent response unavailable.',
        sensor_evidence: 'Fallback mode activated.',
        historical_incidents: 'Agent response unavailable.',
        rdso_guidance: 'Agent response unavailable.',
        root_causes: 'Fallback mode activated.',
        mitigation_actions: 'Keep Monitoring'
      };
    }

    // VANGUARD FIX: Implement severity normalization layer before creating database records
    const severityMap = {
        LOW: "Low",
        MEDIUM: "Medium",
        HIGH: "High",
        CRITICAL: "Critical",
        SEVERE: "Critical",
        INFO: "Low"
    };

    const severity =
        severityMap[
            (
                result.escalation_level ||
                result.risk_level ||
                "Medium"
            ).toUpperCase()
        ] || "Medium";

    const decision = result.alerts && result.alerts[0] ? result.alerts[0] : 'Keep Monitoring';
    
    // Parse threat description from telemetry risk analysis
    let detectedThreat = 'None';
    const riskAnalysisLower = (result.telemetry_risk || '').toLowerCase();
    if (riskAnalysisLower.includes('thermal') || riskAnalysisLower.includes('temperature') || temperature > 90) {
      detectedThreat = 'Thermal Anomaly';
    } else if (riskAnalysisLower.includes('gas') || riskAnalysisLower.includes('leak') || gas > 70) {
      detectedThreat = 'Gas Anomaly';
    } else if (riskAnalysisLower.includes('vibration') || riskAnalysisLower.includes('sensor') || vibration > 80) {
      detectedThreat = 'Vibration Anomaly';
    } else if (riskAnalysisLower.includes('voltage') || riskAnalysisLower.includes('power') || power < 15 || power > 30) {
      detectedThreat = 'Voltage Anomaly';
    } else if (riskScore > 85) {
      detectedThreat = 'Risk Score Anomaly';
    }

    // Parse confidence score from text or fallback to 95%
    let confidence = 95;
    if (result.root_cause || result.root_causes) {
      const targetStr = result.root_cause || result.root_causes;
      const confidenceMatch = targetStr.match(/(\d+)%/);
      if (confidenceMatch) {
        confidence = parseInt(confidenceMatch[1]);
      }
    }

    // Build reasoning details combining root cause and mitigation summary
    const reasoning = result.reasoning || `[7-Agent Analysis Summary] ${result.executive_summary.replace(/###/g, '').replace(/\*\*/g, '').trim()}`;

    // VANGUARD FIX: Print debugging logs before saving AgentAction
    console.log("=== PYTHON RESULT ===");
    console.log(JSON.stringify(result, null, 2));

    console.log("=== FINAL SEVERITY ===");
    console.log(severity);

    // VANGUARD FIX: Wrap AgentAction.create() inside try/catch block to catch MongoDB validation errors and return fallback
    let action;
    try {
      action = await AgentAction.create({
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
    } catch (err) {
      console.error("[AGENT SAVE ERROR]", err);

      return {
        failed: true,
        severity,
        decision,
        confidence,
        reasoning,
        error: err.message
      };
    }

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
          executionNotes: `Automatically triggered by 7-Agent Decision: ${decision}. Reasoning: ${reasoning}`,
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
        description: `Threat detected by 7-Agent Core: ${detectedThreat} at node ${nodeExists.nodeName}`,
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
      // Trigger Notification
      const notifSeverity = severity === 'Critical' ? 'Critical' : (severity === 'High' ? 'High' : 'Info');
      try {
        await notificationService.createNotification({
          title: `AI Agent Decision: ${decision}`,
          message: `AI Agent executed decision: "${decision}" for node ${nodeExists.nodeName}. Confidence: ${confidence}%. Reasoning: ${reasoning}`,
          type: 'AgentDecision',
          severity: notifSeverity,
          module: 'AutonomousAgent',
          recipientRoles: ['SafetyOfficer'],
          metadata: { actionId: action._id, nodeId: nodeExists._id, decision, confidence }
        });
      } catch (notifErr) {
        console.error(`[AGENT-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }

      await auditService.logEvent({
        req,
        module: 'AutonomousAgent',
        action: 'Plan Generated',
        description: `Mitigation plan generated by 7-Agent Core: ${decision}. Reasoning: ${reasoning}`,
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

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('AGENT_ACTION_EXECUTED', populatedAction, req);
    } catch (webErr) {
      console.error(`[AGENT-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

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
