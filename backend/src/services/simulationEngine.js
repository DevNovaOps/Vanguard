import SimulationRun from '../models/SimulationRun.js';
import SimulationEvent from '../models/SimulationEvent.js';
import RailwayNode from '../models/RailwayNode.js';

import auditService from './auditService.js';
import Incident from '../models/Incident.js';
import complianceService from './complianceService.js';
import riskService from './riskService.js';
import incidentService from './incidentService.js';
import incidentPriorityService from './incidentPriorityService.js';
import aiAgentService from './aiAgentService.js';
import mitigationService from './mitigationService.js';
import webhookService from './webhookService.js';
import notificationService from './notificationService.js';
import { logAudit } from '../utils/auditLogger.js';
import { getIO } from '../config/socket.js';

// Track active simulation to prevent concurrent runs
let activeRunId = null;

/**
 * Delay helper — pauses execution for visual effect between steps
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Emit a Socket.IO event safely
 */
function emitSocket(eventName, payload) {
  try {
    const io = getIO();
    io.emit(eventName, payload);
    console.log(`[SIMULATION-SOCKET] Emitted ${eventName} for step ${payload.stepNumber || 'N/A'}`);
  } catch (error) {
    console.warn(`[SIMULATION-SOCKET] Failed to emit ${eventName}: ${error.message}`);
  }
}

/**
 * Execute a single simulation step with persistence and Socket.IO emission
 */
async function executeStep(run, stepNumber, stepName, module, executeFn) {
  const stepStart = Date.now();

  // Create event in DB
  const event = await SimulationEvent.create({
    runId: run._id,
    stepNumber,
    stepName,
    module,
    status: 'running',
    startedAt: new Date()
  });

  // Emit step start
  emitSocket('simulation:step', {
    runId: run.runId,
    runObjectId: run._id,
    stepNumber,
    stepName,
    module,
    status: 'running',
    description: `Executing: ${stepName}...`,
    data: null
  });

  try {
    // Execute the step logic
    const result = await executeFn();

    const duration = Date.now() - stepStart;
    const description = result.description || `${stepName} completed successfully`;

    // Update event
    event.status = 'completed';
    event.description = description;
    event.data = result.data || {};
    event.completedAt = new Date();
    event.duration = duration;
    await event.save();

    // Update run progress
    run.currentStep = stepNumber;
    run.completedSteps = stepNumber;
    await run.save();

    // Emit step completion
    emitSocket('simulation:step', {
      runId: run.runId,
      runObjectId: run._id,
      stepNumber,
      stepName,
      module,
      status: 'completed',
      description,
      data: result.data || {},
      duration
    });

    return result;
  } catch (error) {
    const duration = Date.now() - stepStart;

    event.status = 'failed';
    event.description = `Failed: ${error.message}`;
    event.completedAt = new Date();
    event.duration = duration;
    await event.save();

    emitSocket('simulation:step', {
      runId: run.runId,
      runObjectId: run._id,
      stepNumber,
      stepName,
      module,
      status: 'failed',
      description: `Failed: ${error.message}`,
      data: { error: error.message },
      duration
    });

    // Don't throw — mark and continue to next step
    console.error(`[SIMULATION] Step ${stepNumber} (${stepName}) failed: ${error.message}`);
    return { data: { error: error.message }, description: `Failed: ${error.message}` };
  }
}

export const simulationEngine = {
  /**
   * Run the full 9-step failure simulation cascade
   */
  async runFullSimulation(req) {
    // Prevent concurrent simulations
    if (activeRunId) {
      const activeRun = await SimulationRun.findById(activeRunId);
      if (activeRun && activeRun.status === 'Running') {
        throw new Error('A simulation is already running. Please wait for it to complete.');
      }
      activeRunId = null;
    }

    // Find target node (BRC — Vadodara Junction, or fallback)
    let node = await RailwayNode.findOne({ nodeCode: 'BRC' });
    if (!node) {
      node = await RailwayNode.findOne({});
    }
    if (!node) {
      throw new Error('No railway nodes found in the database. Run database seed first.');
    }

    // Create the simulation run
    const run = await SimulationRun.create({
      triggeredBy: req?.user?._id || null,
      nodeId: node._id,
      status: 'Running',
      totalSteps: 7,
      startedAt: new Date()
    });

    activeRunId = run._id;

    // Trigger Notification
    try {
      await notificationService.createNotification({
        title: `Simulation Started: Run ${run.runId}`,
        message: `Cinematic failure cascade simulation has started on node ${node.nodeName} (${node.nodeCode}). Status: Running.`,
        type: 'SimulationStarted',
        severity: 'Info',
        module: 'Simulation',
        recipientRoles: ['Operator'],
        metadata: { runId: run._id, runCode: run.runId, nodeId: node._id }
      });
    } catch (notifErr) {
      console.error(`[SIMULATION-START-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
    }

    console.log(`[SIMULATION] ======= Starting Simulation ${run.runId} on node ${node.nodeName} =======`);

    // Emit simulation start
    emitSocket('simulation:start', {
      runId: run.runId,
      runObjectId: run._id,
      nodeId: node._id,
      nodeCode: node.nodeCode,
      nodeName: node.nodeName,
      totalSteps: 7
    });

    // Audit log
    try {
      await auditService.logSimulationStart(req, node);
    } catch (e) {
      console.warn('[SIMULATION] Audit log failed:', e.message);
    }

    // Trigger Webhook Event
    try {
      await webhookService.triggerEvent('SIMULATION_STARTED', {
        runId: run.runId,
        nodeId: node._id,
        nodeCode: node.nodeCode,
        nodeName: node.nodeName,
        startedAt: run.startedAt
      }, req);
    } catch (webErr) {
      console.error(`[SIMULATION-START-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
    }

    // Accumulated context across steps
    const ctx = {
      node,
      violations: [],
      riskResult: null,
      incident: null,
      agentAction: null,
      mitigation: null,
      heapPosition: null
    };

    // Telemetry scenario parameters generated in Step 1
    const telemetryPack = {
      nodeId: node._id,
      temperature: 135, // Spike temperature 135°C
      vibration: 85,    // Vibration 85 mm/s
      gas: 40,
      power: 24,
      riskScore: 87
    };

    try {
      // ============================================================
      // STEP 1: Generate simulated failure scenario
      // ============================================================
      await delay(1200);
      await executeStep(run, 1, 'Generate Simulated Failure Scenario', 'telemetry', async () => {
        try {
          await auditService.logSimulationStep(req, {
            name: 'Failure Scenario Generated',
            description: `Generated simulated telemetry failure conditions at node ${node.nodeName} (${node.nodeCode}): Temp: 135°C, Vibration: 85 mm/s.`,
            severity: 'Warning',
            nodeId: node._id
          });
        } catch (e) {
          console.warn('[SIMULATION] Scenario generation audit log failed:', e.message);
        }

        return {
          description: `Simulated telemetry failure conditions generated at node ${node.nodeName} (${node.nodeCode}): Temperature 135°C, Vibration 85 mm/s, Gas 40 ppm, Power Grid 24 kV.`,
          data: telemetryPack
        };
      });

      // ============================================================
      // STEP 2: Execute all 7 agents sequentially
      // ============================================================
      await delay(2000);
      await executeStep(run, 2, 'Execute 7-Agent Pipeline', 'agent', async () => {
        // Evaluate telemetry triggers the multi-agent pipeline
        const agentResult = await aiAgentService.evaluateTelemetry(telemetryPack, req);
        ctx.agentAction = agentResult;
        run.result.agentDecision = agentResult.decision;
        await run.save();

        return {
          description: `Executed all 7 agents sequentially (Telemetry -> Retrieval -> Sensor -> Historical -> Root Cause -> Mitigation -> Executive Decision). AI Decision: "${agentResult.decision}" (Confidence: ${agentResult.confidence}%)`,
          data: {
            actionId: agentResult._id,
            decision: agentResult.decision,
            confidence: agentResult.confidence,
            detectedThreat: agentResult.detectedThreat,
            reasoning: agentResult.reasoning
          }
        };
      });

      // ============================================================
      // STEP 3: Aggregate outputs
      // ============================================================
      await delay(1500);
      await executeStep(run, 3, 'Aggregate Agent Outputs', 'reports', async () => {
        const aggregated = {
          telemetryRisk: (ctx.agentAction?.reasoning || '').includes('[7-Agent Analysis Summary]') ? 'Executed: Trend anomalies diagnosed.' : 'Fallback rules evaluated.',
          manualsRetrieved: (ctx.agentAction?.reasoning || '').includes('RDSO') ? 'RDSO standards referenced.' : 'System catalogs matching standard procedures.',
          sensorInterpretation: `Vibration analysis compiled: RMS and kurtosis interpreted. Anomalies found in RMS.`,
          historicalRecurrence: `Prior incident CSV queries matching symptoms found. Recurrence probability estimated.`,
          rankedRootCauses: `Root causes ranked by probability. Primary suspect: Overheating/vibration cascade.`
        };

        return {
          description: `Aggregated multi-agent outputs: Compiled Telemetry Risk, Chroma manuals retrieved, sensor feature RMS summaries, prior incidents CSV correlation, and ranked root causes.`,
          data: aggregated
        };
      });

      // ============================================================
      // STEP 4: Calculate overall risk score
      // ============================================================
      await delay(1500);
      await executeStep(run, 4, 'Calculate Overall Risk', 'risk', async () => {
        const riskScore = telemetryPack.riskScore; 
        const riskResult = await riskService.evaluateNodeRisk({
          nodeId: node._id,
          riskScore: riskScore,
          reason: ctx.agentAction?.reasoning || `Thermal/vibration anomaly cascade detected by Multi-Agent Core.`,
          req
        });
        ctx.riskResult = riskResult;
        run.result.riskScore = riskScore;
        await run.save();

        // Log Risk Increased
        try {
          await auditService.logSimulationStep(req, {
            name: 'Risk Score Calculated',
            description: `Vanguard Multi-Agent Core computed overall risk score of ${riskScore}/100 for node ${node.nodeName}. Severity: ${riskResult.severity}.`,
            severity: riskResult.severity === 'Critical' ? 'Critical' : 'Warning',
            nodeId: node._id
          });
        } catch (e) {
          console.warn('[SIMULATION] Risk audit log failed:', e.message);
        }

        return {
          description: `Vanguard Multi-Agent Core calculated overall risk score of ${riskScore}/100. Threat severity classified as ${riskResult.severity || 'Critical'}.`,
          data: {
            nodeId: riskResult.nodeId,
            riskScore: riskResult.riskScore,
            severity: riskResult.severity,
            incidentCreated: riskResult.incidentCreated
          }
        };
      });

      // ============================================================
      // STEP 5: Store results in MongoDB
      // ============================================================
      await delay(1200);
      await executeStep(run, 5, 'Store Results in MongoDB', 'database', async () => {
        // Recalculate heap priority queue in DB
        const queue = await incidentPriorityService.triggerRecalculation(req);
        const position = queue.findIndex(item => {
          const itemNodeId = item.nodeId?._id?.toString() || item.nodeId?.toString();
          return itemNodeId === node._id.toString();
        });
        ctx.heapPosition = position >= 0 ? position + 1 : null;
        run.result.heapPosition = ctx.heapPosition || 0;
        await run.save();

        return {
          description: `Persisted multi-agent reports and simulation metadata to MongoDB. Max Heap recalculated: promoting incident to queue position #${run.result.heapPosition}.`,
          data: {
            runId: run.runId,
            persistedCollections: ['SimulationRun', 'AgentAction', 'RiskScore', 'AuditLog'],
            heapPosition: run.result.heapPosition
          }
        };
      });

      // ============================================================
      // STEP 6: Generate incidents automatically if required
      // ============================================================
      await delay(1500);
      await executeStep(run, 6, 'Generate Incident & Action', 'incidents', async () => {
        let incident = await Incident.findOne({
          nodeId: node._id,
          status: { $in: ['Open', 'Investigating', 'Mitigating'] }
        }).populate('nodeId');

        if (!incident) {
          incident = await incidentService.createIncident({
            nodeId: node._id,
            riskScore: telemetryPack.riskScore,
            title: `Simulated Critical Failure: ${node.nodeName}`,
            description: `Failure simulation: 7-Agent pipeline diagnosed high risk at ${node.nodeName}. Reasoning: ${ctx.agentAction?.reasoning || 'Diagnostic details unavailable.'}`,
            source: 'Simulation',
            status: 'Open'
          }, req);
        }

        ctx.incident = incident;
        run.result.incidentId = incident.incidentId;
        
        // Find the mitigation that was created
        const { default: Mitigation } = await import('../models/Mitigation.js');
        let mitigation = await Mitigation.findOne({ nodeId: node._id })
          .sort({ createdAt: -1 })
          .populate('nodeId')
          .populate('incidentId');

        if (mitigation) {
          ctx.mitigation = mitigation;
          run.result.mitigationId = mitigation.mitigationId;
        }
        await run.save();

        return {
          description: `Safety Incident ${incident.incidentId} generated and confirmed in database. Associated Mitigation Action: "${mitigation ? mitigation.action : 'Maintenance Dispatch'}" (ID: ${mitigation ? mitigation.mitigationId : 'Pending'}).`,
          data: {
            incidentId: incident.incidentId,
            severity: incident.severity,
            status: incident.status,
            mitigationId: mitigation ? mitigation.mitigationId : null,
            mitigationAction: mitigation ? mitigation.action : null
          }
        };
      });

      // ============================================================
      // STEP 7: Refresh all frontend modules
      // ============================================================
      await delay(1200);
      await executeStep(run, 7, 'System Refresh & Stabilize', 'network', async () => {
        if (ctx.incident) {
          try {
            await incidentService.resolveIncident(ctx.incident._id.toString(), req);
          } catch (e) {
            console.warn(`[SIMULATION] Could not resolve incident: ${e.message}`);
          }
        }

        try {
          await auditService.logSimulationStep(req, {
            name: 'System Stabilized',
            description: `Telemetry readings returning to normal operating thresholds. All systems stable.`,
            severity: 'Info',
            nodeId: node._id
          });
        } catch (e) {
          console.warn('[SIMULATION] System stabilized audit log failed:', e.message);
        }

        return {
          description: `Vanguard ARC safety procedures executed. All modules (Dashboard, Telemetry, Risk Analysis, Incidents) refreshed. Network stabilized.`,
          data: {
            refreshedModules: [
              'Dashboard.jsx',
              'TelemetryCenter.jsx',
              'RiskAnalysis.jsx',
              'IncidentManagement.jsx',
              'AutonomousAgent.jsx',
              'MitigationCenter.jsx'
            ],
            newStatus: 'Resolved',
            stabilizedAt: new Date().toISOString()
          }
        };
      });

      // ============================================================
      // SIMULATION COMPLETE
      // ============================================================
      run.status = 'Completed';
      run.completedSteps = 7;
      run.completedAt = new Date();
      await run.save();

      // Trigger Notification
      try {
        await notificationService.createNotification({
          title: `Simulation Completed: Run ${run.runId}`,
          message: `Cinematic failure cascade simulation has successfully completed on node ${node.nodeName} (${node.nodeCode}). Status: Completed.`,
          type: 'SimulationCompleted',
          severity: 'Info',
          module: 'Simulation',
          recipientRoles: ['Operator'],
          metadata: { runId: run._id, runCode: run.runId, nodeId: node._id, result: run.result }
        });
      } catch (notifErr) {
        console.error(`[SIMULATION-COMPLETE-NOTIFICATION-ERROR] Failed to trigger notification: ${notifErr.message}`);
      }

      activeRunId = null;

      emitSocket('simulation:complete', {
        runId: run.runId,
        runObjectId: run._id,
        status: 'Completed',
        totalDuration: Date.now() - run.startedAt.getTime(),
        result: run.result
      });

      // Final audit log using auditService
      try {
        await auditService.logSimulationComplete(req, node);
      } catch (e) {
        console.warn('[SIMULATION] Final audit log failed:', e.message);
      }

      // Trigger Webhook Event
      try {
        await webhookService.triggerEvent('SIMULATION_COMPLETED', {
          runId: run.runId,
          nodeId: node._id,
          nodeCode: node.nodeCode,
          nodeName: node.nodeName,
          completedAt: run.completedAt,
          result: run.result
        }, req);
      } catch (webErr) {
        console.error(`[SIMULATION-COMPLETE-WEBHOOK-ERROR] Failed to trigger webhook: ${webErr.message}`);
      }

      console.log(`[SIMULATION] ======= Simulation ${run.runId} COMPLETED =======`);

      return run;
    } catch (error) {
      // Critical failure
      run.status = 'Failed';
      run.errorMessage = error.message;
      run.completedAt = new Date();
      await run.save();

      activeRunId = null;

      emitSocket('simulation:failed', {
        runId: run.runId,
        runObjectId: run._id,
        status: 'Failed',
        error: error.message
      });

      console.error(`[SIMULATION] ======= Simulation ${run.runId} FAILED: ${error.message} =======`);
      throw error;
    }
  },

  /**
   * Alias/wrapper for running simulation from tests or other services
   */
  async triggerSimulation(req) {
    return this.runFullSimulation(req);
  },

  /**
   * Get simulation run history
   */
  async getSimulationHistory() {
    return await SimulationRun.find({})
      .populate('triggeredBy', 'name email role')
      .populate('nodeId', 'nodeCode nodeName status region')
      .sort({ createdAt: -1 })
      .limit(50);
  },

  /**
   * Get a specific simulation run with all its events
   */
  async getSimulationRun(runId) {
    const run = await SimulationRun.findOne({ runId })
      .populate('triggeredBy', 'name email role')
      .populate('nodeId', 'nodeCode nodeName status region');

    if (!run) {
      const error = new Error(`Simulation run ${runId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const events = await SimulationEvent.find({ runId: run._id })
      .sort({ stepNumber: 1 });

    return { run, events };
  },

  /**
   * Get aggregate simulation statistics
   */
  async getSimulationStats() {
    const totalRuns = await SimulationRun.countDocuments({});
    const completedRuns = await SimulationRun.countDocuments({ status: 'Completed' });
    const failedRuns = await SimulationRun.countDocuments({ status: 'Failed' });
    const runningRuns = await SimulationRun.countDocuments({ status: 'Running' });

    const successRate = totalRuns > 0
      ? parseFloat(((completedRuns / totalRuns) * 100).toFixed(1))
      : 100;

    // Average duration of completed runs
    const durationStats = await SimulationRun.aggregate([
      { $match: { status: 'Completed', completedAt: { $ne: null } } },
      {
        $project: {
          duration: { $subtract: ['$completedAt', '$startedAt'] }
        }
      },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);
    const avgDuration = durationStats.length > 0
      ? Math.round(durationStats[0].avgDuration)
      : 0;

    // Last run
    const lastRun = await SimulationRun.findOne({})
      .populate('triggeredBy', 'name email role')
      .populate('nodeId', 'nodeCode nodeName')
      .sort({ createdAt: -1 });

    return {
      totalRuns,
      completedRuns,
      failedRuns,
      runningRuns,
      successRate,
      avgDuration,
      lastRun
    };
  },

  /**
   * Check if a simulation is currently running
   */
  isSimulationRunning() {
    return !!activeRunId;
  }
};

export default simulationEngine;
