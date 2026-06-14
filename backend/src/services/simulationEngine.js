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

// Timeout for individual simulation steps (especially the AI agent step): 130 seconds
const STEP_TIMEOUT_MS = 300000;

/**
 * Wrap a promise with a timeout. Rejects with a descriptive error if the promise
 * does not resolve within the specified duration.
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    )
  ]);
}

// On module load, clear any stale "Running" simulations left from previous server session
(async () => {
  try {
    const staleCount = await SimulationRun.updateMany(
      { status: 'Running' },
      { $set: { status: 'Failed', errorMessage: 'Server restarted while simulation was running.', completedAt: new Date() } }
    );
    if (staleCount.modifiedCount > 0) {
      console.log(`[SIMULATION-ENGINE] Cleaned up ${staleCount.modifiedCount} stale 'Running' simulation(s) from previous session.`);
    }
  } catch (e) {
    // DB might not be connected yet — that's fine, the check in runFullSimulation will handle it
  }
})();

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
    // Clear stale in-memory lock: verify the DB record is actually still running
    if (activeRunId) {
      const activeRun = await SimulationRun.findById(activeRunId);
      if (activeRun && activeRun.status === 'Running') {
        // Check if it's been running for more than 10 minutes — treat as stuck
        const runningFor = Date.now() - new Date(activeRun.startedAt).getTime();
        if (runningFor > 10 * 60 * 1000) {
          console.warn(`[SIMULATION-ENGINE] Stale simulation ${activeRun.runId} running for ${Math.round(runningFor/1000)}s. Marking as Failed.`);
          activeRun.status = 'Failed';
          activeRun.errorMessage = 'Simulation timed out (exceeded 10 minute limit).';
          activeRun.completedAt = new Date();
          await activeRun.save();
          activeRunId = null;
        } else {
          throw new Error('A simulation is already running. Please wait for it to complete.');
        }
      } else {
        activeRunId = null;
      }
    }

    // Also check DB for any truly stuck 'Running' simulations not tracked in memory
    const dbStaleRuns = await SimulationRun.find({ status: 'Running' });
    for (const stale of dbStaleRuns) {
      const age = Date.now() - new Date(stale.startedAt).getTime();
      if (age > 10 * 60 * 1000) {
        stale.status = 'Failed';
        stale.errorMessage = 'Simulation timed out (exceeded 10 minute limit).';
        stale.completedAt = new Date();
        await stale.save();
        console.warn(`[SIMULATION-ENGINE] Cleaned up stale DB simulation: ${stale.runId}`);
      }
    }

    const { node: nestedNode, nodeCode, nodeId, temperature, vibration, gas, power, hazardousGas, voltage } = req?.body || {};

    // Find target node based on user selection, fallback to BRC or first node
    let nodeObj;
    const searchCode = nestedNode?.code || nodeCode;
    const searchId = nestedNode?.id || nodeId;

    if (searchCode) {
      nodeObj = await RailwayNode.findOne({ nodeCode: searchCode.toUpperCase() });
    } else if (searchId) {
      nodeObj = await RailwayNode.findById(searchId);
    }
    if (!nodeObj && nestedNode?.name) {
      nodeObj = await RailwayNode.findOne({ nodeName: nestedNode.name });
    }
    if (!nodeObj) {
      nodeObj = await RailwayNode.findOne({ nodeCode: 'BRC' });
    }
    if (!nodeObj) {
      nodeObj = await RailwayNode.findOne({});
    }
    if (!nodeObj) {
      throw new Error('No railway nodes found in the database. Run database seed first.');
    }

    const node = nodeObj;

    // Telemetry values: defaults if not passed
    const temperatureVal = (temperature !== undefined && temperature !== null) ? Number(temperature) : 135;
    const vibrationVal = (vibration !== undefined && vibration !== null) ? Number(vibration) : 85;
    const gasVal = (hazardousGas !== undefined && hazardousGas !== null) ? Number(hazardousGas) : 
                   ((gas !== undefined && gas !== null) ? Number(gas) : 40);
    const powerVal = (voltage !== undefined && voltage !== null) ? Number(voltage) : 
                     ((power !== undefined && power !== null) ? Number(power) : 24);

    // Point-based risk score calculations
    let totalPoints = 0;

    // Temperature
    if (temperatureVal < 70) {
      totalPoints += 10;
    } else if (temperatureVal >= 70 && temperatureVal <= 90) {
      totalPoints += 25;
    } else if (temperatureVal > 90) {
      totalPoints += 40;
    }

    // Vibration
    if (vibrationVal < 40) {
      totalPoints += 10;
    } else if (vibrationVal >= 40 && vibrationVal <= 80) {
      totalPoints += 25;
    } else if (vibrationVal > 80) {
      totalPoints += 35;
    }

    // Hazardous Gas
    if (gasVal < 30) {
      totalPoints += 5;
    } else if (gasVal >= 30 && gasVal <= 70) {
      totalPoints += 15;
    } else if (gasVal > 70) {
      totalPoints += 30;
    }

    // Power
    if (powerVal >= 15 && powerVal <= 30) {
      totalPoints += 0;
    } else {
      totalPoints += 20;
    }

    const riskScore = Math.min(totalPoints, 100);

    const simulationConfig = {
      node: {
        name: node.nodeName,
        code: node.nodeCode,
        type: node.nodeType
      },
      temperature: temperatureVal,
      vibration: vibrationVal,
      hazardousGas: gasVal,
      voltage: powerVal,
      riskScore: riskScore
    };
    console.log("ENGINE INPUT:", simulationConfig);

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

    // Telemetry scenario parameters generated dynamically
    const telemetryPack = {
      nodeId: node._id,
      temperature: temperatureVal,
      vibration: vibrationVal,
      gas: gasVal,
      power: powerVal,
      riskScore: riskScore
    };

    try {
      // ============================================================
      // STEP 1: Generate simulated failure scenario
      // ============================================================
      console.time('[SIMULATION] Step 1 - Generate Failure Scenario');
      await delay(1200);
      await executeStep(run, 1, 'Generate Simulated Failure Scenario', 'telemetry', async () => {
        try {
          await auditService.logSimulationStep(req, {
            name: 'Failure Scenario Generated',
            description: `Generated simulated telemetry failure conditions at node ${node.nodeName} (${node.nodeCode}): Temp: ${temperatureVal}°C, Vibration: ${vibrationVal} mm/s.`,
            severity: 'Warning',
            nodeId: node._id
          });
        } catch (e) {
          console.warn('[SIMULATION] Scenario generation audit log failed:', e.message);
        }

        return {
          description: `Simulated telemetry failure conditions generated at node ${node.nodeName} (${node.nodeCode}): Temperature ${temperatureVal}°C, Vibration ${vibrationVal} mm/s, Gas ${gasVal} ppm, Power Grid ${powerVal} kV.`,
          data: telemetryPack
        };
      });
      console.timeEnd('[SIMULATION] Step 1 - Generate Failure Scenario');

      // ============================================================
      // STEP 2: Execute all 7 agents sequentially
      // VANGUARD FIX: Wrapped with 130-second timeout to prevent indefinite hang
      // ============================================================
      console.time('[SIMULATION] Step 2 - Execute 7-Agent Pipeline');
      await delay(2000);
      await executeStep(run, 2, 'Execute 7-Agent Pipeline', 'agent', async () => {
        // Evaluate telemetry triggers the multi-agent pipeline — with timeout protection
        const agentResult = await withTimeout(
          aiAgentService.evaluateTelemetry(telemetryPack, req),
          STEP_TIMEOUT_MS,
          'AI Agent Pipeline (Step 2)'
        );
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
      console.timeEnd('[SIMULATION] Step 2 - Execute 7-Agent Pipeline');

      // ============================================================
      // STEP 3: Aggregate outputs
      // ============================================================
      console.time('[SIMULATION] Step 3 - Aggregate Outputs');
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
      console.timeEnd('[SIMULATION] Step 3 - Aggregate Outputs');

      // ============================================================
      // STEP 4: Calculate overall risk score
      // ============================================================
      console.time('[SIMULATION] Step 4 - Calculate Risk');
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
      console.timeEnd('[SIMULATION] Step 4 - Calculate Risk');

      // ============================================================
      // STEP 5: Store results in MongoDB
      // ============================================================
      console.time('[SIMULATION] Step 5 - Store Results');
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
      console.timeEnd('[SIMULATION] Step 5 - Store Results');

      // ============================================================
      // STEP 6: Generate incidents automatically if required
      // ============================================================
      console.time('[SIMULATION] Step 6 - Generate Incidents');
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
      console.timeEnd('[SIMULATION] Step 6 - Generate Incidents');

      // ============================================================
      // STEP 7: Refresh all frontend modules
      // ============================================================
      console.time('[SIMULATION] Step 7 - System Stabilize');
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
      console.timeEnd('[SIMULATION] Step 7 - System Stabilize');

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


      // activeRunId cleanup and simulation:complete emission are handled by the finally block

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
      // Critical failure — mark simulation as Failed and persist the actual step reached
      console.error(`[SIMULATION] ======= Simulation ${run.runId} FAILED: ${error.message} =======`);

      try {
        run.status = 'Failed';
        run.errorMessage = error.message;
        run.completedAt = new Date();
        // completedSteps is already tracked by executeStep(), so it reflects the last successful step
        await run.save();
        console.log(`[SIMULATION] Persisted failure state: completedSteps=${run.completedSteps}`);
      } catch (saveErr) {
        console.error(`[SIMULATION] Failed to persist failure state: ${saveErr.message}`);
      }

      // Emit error event for frontend awareness
      emitSocket('simulation:error', {
        runId: run.runId,
        runObjectId: run._id,
        status: 'Failed',
        error: error.message
      });

      throw error;
    } finally {
      // VANGUARD FIX: Guarantee cleanup — no code path may exit without this
      activeRunId = null;

      // Always emit simulation:complete so the frontend never waits indefinitely
      emitSocket('simulation:complete', {
        runId: run.runId,
        runObjectId: run._id,
        status: run.status,
        totalDuration: Date.now() - run.startedAt.getTime(),
        result: run.result
      });

      console.log(`[SIMULATION] ======= Cleanup complete for ${run.runId} (status: ${run.status}) =======`);
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
