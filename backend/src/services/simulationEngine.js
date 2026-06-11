import SimulationRun from '../models/SimulationRun.js';
import SimulationEvent from '../models/SimulationEvent.js';
import RailwayNode from '../models/RailwayNode.js';
import Incident from '../models/Incident.js';
import complianceService from './complianceService.js';
import riskService from './riskService.js';
import incidentService from './incidentService.js';
import incidentPriorityService from './incidentPriorityService.js';
import aiAgentService from './aiAgentService.js';
import mitigationService from './mitigationService.js';
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
      startedAt: new Date()
    });

    activeRunId = run._id;

    console.log(`[SIMULATION] ======= Starting Simulation ${run.runId} on node ${node.nodeName} =======`);

    // Emit simulation start
    emitSocket('simulation:start', {
      runId: run.runId,
      runObjectId: run._id,
      nodeId: node._id,
      nodeCode: node.nodeCode,
      nodeName: node.nodeName,
      totalSteps: 9
    });

    // Audit log
    try {
      await logAudit({
        req,
        module: 'Simulation',
        action: 'Simulation Started',
        description: `Failure simulation ${run.runId} started on node ${node.nodeName} (${node.nodeCode})`,
        metadata: { runId: run.runId, nodeId: node._id }
      });
    } catch (e) {
      console.warn('[SIMULATION] Audit log failed:', e.message);
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

    try {
      // ============================================================
      // STEP 1: Sensor Anomaly Detected
      // ============================================================
      await delay(1200);
      await executeStep(run, 1, 'Sensor Anomaly Detected', 'telemetry', async () => {
        const spikeTemp = 130 + Math.round(Math.random() * 20); // 130-150°C
        return {
          description: `Temperature spike detected on ${node.nodeName} (${node.nodeCode}): ${spikeTemp}°C exceeds safety threshold of 120°C`,
          data: {
            nodeCode: node.nodeCode,
            nodeName: node.nodeName,
            sensorType: 'Temperature',
            value: spikeTemp,
            threshold: 120,
            unit: '°C'
          }
        };
      });

      // ============================================================
      // STEP 2: Compliance Violation
      // ============================================================
      await delay(1500);
      const step2 = await executeStep(run, 2, 'Compliance Violation', 'compliance', async () => {
        const violations = await complianceService.evaluateReading({
          nodeId: node._id,
          sensorType: 'Temperature',
          value: 135
        });
        ctx.violations = violations;
        return {
          description: violations.length > 0
            ? `Compliance violation detected: ${violations.length} rule(s) breached. Rule ${violations[0]?.ruleId?.ruleCode || 'API617-TEMP'} exceeded threshold.`
            : `Compliance check completed — temperature reading evaluated against active rules (${violations.length} new violations, existing ones may already be tracked).`,
          data: {
            violationsCreated: violations.length,
            violations: violations.map(v => ({
              id: v._id,
              ruleId: v.ruleId,
              severity: v.severity,
              actualValue: v.actualValue,
              expectedValue: v.expectedValue
            }))
          }
        };
      });

      // ============================================================
      // STEP 3: Risk Score Calculated
      // ============================================================
      await delay(1500);
      const step3 = await executeStep(run, 3, 'Risk Score Calculated', 'risk', async () => {
        const riskResult = await riskService.evaluateNodeRisk({
          nodeId: node._id,
          riskScore: 87,
          reason: `Simulated thermal anomaly cascade at ${node.nodeName}. Temperature readings significantly exceed safe operational limits.`,
          req
        });
        ctx.riskResult = riskResult;
        run.result.riskScore = 87;
        await run.save();

        return {
          description: `Risk score elevated to ${riskResult.riskScore}/100 — ${riskResult.severity} classification. Incident ${riskResult.incidentCreated ? 'auto-created' : 'already tracked'}.`,
          data: {
            nodeId: riskResult.nodeId,
            riskScore: riskResult.riskScore,
            severity: riskResult.severity,
            incidentCreated: riskResult.incidentCreated
          }
        };
      });

      // ============================================================
      // STEP 4: Heap Prioritization
      // ============================================================
      await delay(1200);
      const step4 = await executeStep(run, 4, 'Heap Prioritization', 'incidents', async () => {
        const queue = await incidentPriorityService.triggerRecalculation(req);
        // Find our node's incident position in the queue
        const position = queue.findIndex(item => {
          const itemNodeId = item.nodeId?._id?.toString() || item.nodeId?.toString();
          return itemNodeId === node._id.toString();
        });
        ctx.heapPosition = position >= 0 ? position + 1 : null;
        run.result.heapPosition = ctx.heapPosition || 0;
        await run.save();

        return {
          description: ctx.heapPosition
            ? `Max Heap re-ordered: Incident at ${node.nodeName} promoted to priority position #${ctx.heapPosition} in queue of ${queue.length}`
            : `Max Heap recalculated with ${queue.length} active incidents in priority queue`,
          data: {
            queueSize: queue.length,
            position: ctx.heapPosition,
            topIncident: queue[0] ? { incidentId: queue[0].incidentId, riskScore: queue[0].riskScore, severity: queue[0].severity } : null
          }
        };
      });

      // ============================================================
      // STEP 5: Incident Created / Confirmed
      // ============================================================
      await delay(1500);
      const step5 = await executeStep(run, 5, 'Incident Created', 'incidents', async () => {
        // Find the incident that was created by compliance/risk evaluation
        let incident = await Incident.findOne({
          nodeId: node._id,
          status: { $in: ['Open', 'Investigating', 'Mitigating'] }
        }).populate('nodeId');

        if (!incident) {
          // Create one explicitly if the previous steps didn't (e.g. duplicate detection)
          incident = await incidentService.createIncident({
            nodeId: node._id,
            riskScore: 87,
            title: `Simulated Critical Failure: ${node.nodeName}`,
            description: `Failure cascade simulation: Thermal anomaly triggered compliance violations and elevated risk at ${node.nodeName}.`,
            source: 'Simulation',
            status: 'Open'
          }, req);
        }

        ctx.incident = incident;
        run.result.incidentId = incident.incidentId;
        await run.save();

        return {
          description: `Incident ${incident.incidentId} confirmed — Severity: ${incident.severity}, Asset: ${node.nodeCode} (${node.nodeName})`,
          data: {
            incidentId: incident.incidentId,
            severity: incident.severity,
            riskScore: incident.riskScore,
            status: incident.status,
            nodeCode: node.nodeCode
          }
        };
      });

      // ============================================================
      // STEP 6: AI Agent Activated
      // ============================================================
      await delay(2000);
      const step6 = await executeStep(run, 6, 'AI Agent Activated', 'agent', async () => {
        const agentResult = await aiAgentService.evaluateTelemetry({
          temperature: 135,
          vibration: 45,
          gas: 30,
          power: 22,
          riskScore: 87,
          nodeId: node._id
        }, req);
        ctx.agentAction = agentResult;
        run.result.agentDecision = agentResult.decision;
        await run.save();

        return {
          description: `AI Agent decision: "${agentResult.decision}" (Confidence: ${agentResult.confidence}%) — Threat: ${agentResult.detectedThreat}`,
          data: {
            actionId: agentResult._id,
            decision: agentResult.decision,
            confidence: agentResult.confidence,
            severity: agentResult.severity,
            detectedThreat: agentResult.detectedThreat,
            reasoning: agentResult.reasoning
          }
        };
      });

      // ============================================================
      // STEP 7: Mitigation Executed
      // ============================================================
      await delay(1800);
      const step7 = await executeStep(run, 7, 'Mitigation Executed', 'mitigation', async () => {
        // AI Agent auto-creates mitigations — find the most recent one for this node
        const { default: Mitigation } = await import('../models/Mitigation.js');
        let mitigation = await Mitigation.findOne({ nodeId: node._id })
          .sort({ createdAt: -1 })
          .populate('nodeId')
          .populate('incidentId');

        if (mitigation) {
          ctx.mitigation = mitigation;
          run.result.mitigationId = mitigation.mitigationId;
          await run.save();

          return {
            description: `Mitigation ${mitigation.mitigationId} deployed: "${mitigation.action}" on ${node.nodeName} — Status: ${mitigation.status}`,
            data: {
              mitigationId: mitigation.mitigationId,
              action: mitigation.action,
              status: mitigation.status,
              severity: mitigation.severity,
              executionSource: mitigation.executionSource
            }
          };
        }

        return {
          description: `Mitigation action queued for ${node.nodeName} — awaiting operator execution`,
          data: { status: 'queued', nodeName: node.nodeName }
        };
      });

      // ============================================================
      // STEP 8: Network Stabilized
      // ============================================================
      await delay(1500);
      await executeStep(run, 8, 'Network Stabilized', 'network', async () => {
        // Resolve the incident if it's still open
        if (ctx.incident) {
          try {
            await incidentService.resolveIncident(ctx.incident._id.toString(), req);
          } catch (e) {
            console.warn(`[SIMULATION] Could not resolve incident: ${e.message}`);
          }
        }

        return {
          description: `All affected nodes returning to normal operating parameters. Incident at ${node.nodeName} resolved. Safety protocols re-established.`,
          data: {
            nodeCode: node.nodeCode,
            nodeName: node.nodeName,
            newStatus: 'Resolved',
            stabilizedAt: new Date().toISOString()
          }
        };
      });

      // ============================================================
      // STEP 9: Report Generated
      // ============================================================
      await delay(1000);
      await executeStep(run, 9, 'Report Generated', 'reports', async () => {
        const totalDuration = Date.now() - run.startedAt.getTime();

        return {
          description: `Simulation report ${run.runId} compiled. Total cascade duration: ${(totalDuration / 1000).toFixed(1)}s. All ${run.totalSteps} steps executed.`,
          data: {
            runId: run.runId,
            totalDuration,
            totalSteps: run.totalSteps,
            completedSteps: 9,
            violationsCreated: ctx.violations.length,
            incidentId: run.result.incidentId,
            mitigationId: run.result.mitigationId,
            riskScore: run.result.riskScore,
            heapPosition: run.result.heapPosition,
            agentDecision: run.result.agentDecision
          }
        };
      });

      // ============================================================
      // SIMULATION COMPLETE
      // ============================================================
      run.status = 'Completed';
      run.completedSteps = 9;
      run.completedAt = new Date();
      await run.save();

      activeRunId = null;

      emitSocket('simulation:complete', {
        runId: run.runId,
        runObjectId: run._id,
        status: 'Completed',
        totalDuration: Date.now() - run.startedAt.getTime(),
        result: run.result
      });

      // Final audit log
      try {
        await logAudit({
          req,
          module: 'Simulation',
          action: 'Simulation Completed',
          description: `Failure simulation ${run.runId} completed successfully on node ${node.nodeName}`,
          metadata: { runId: run.runId, result: run.result }
        });
      } catch (e) {
        console.warn('[SIMULATION] Final audit log failed:', e.message);
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
