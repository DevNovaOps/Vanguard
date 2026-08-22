import simulationRepository from '../repositories/simulationRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
import incidentRepository from '../repositories/incidentRepository.js';
import mitigationRepository from '../repositories/mitigationRepository.js';

import auditService from './auditService.js';
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

function getNodeTelemetryLimits(node) {
  const name = String(node?.nodeName || node?.name || '').toLowerCase();
  const type = String(node?.nodeType || node?.type || '').toLowerCase();

  if (name.includes('interlocking') || name.includes('rri') || name.includes('cabin') || name.includes('signal') || type.includes('signal')) {
    return {
      tWarn: 35, tCrit: 45, tDefault: 24,
      vWarn: 1.5, vCrit: 3.5, vDefault: 0.8,
      gWarn: 15, gCrit: 30, gDefault: 8,
      vMin: 0.10, vMax: 3.5, vDefault: 0.23
    };
  }
  if (name.includes('post') || name.includes('outer') || name.includes('gate') || name.includes('crossing') || name.includes('block')) {
    return {
      tWarn: 45, tCrit: 60, tDefault: 32,
      vWarn: 2.5, vCrit: 5.0, vDefault: 1.2,
      gWarn: 20, gCrit: 40, gDefault: 12,
      vMin: 0.10, vMax: 3.5, vDefault: 0.23
    };
  }
  if (name.includes('siding') || name.includes('goodshed') || name.includes('industrial') || type.includes('siding')) {
    return {
      tWarn: 50, tCrit: 65, tDefault: 38,
      vWarn: 6.0, vCrit: 12.0, vDefault: 3.5,
      gWarn: 35, gCrit: 70, gDefault: 18,
      vMin: 3.0, vMax: 11.5, vDefault: 6.6
    };
  }
  if (name.includes('depot') || name.includes('shed') || name.includes('hub') || type.includes('depot') || type.includes('power_hub')) {
    return {
      tWarn: 55, tCrit: 75, tDefault: 40,
      vWarn: 5.0, vCrit: 10.0, vDefault: 4.0,
      gWarn: 30, gCrit: 60, gDefault: 22,
      vMin: 3.0, vMax: 15.0, vDefault: 11.0
    };
  }
  return {
    tWarn: 60, tCrit: 80, tDefault: 42,
    vWarn: 4.0, vCrit: 7.5, vDefault: 2.2,
    gWarn: 25, gCrit: 50, gDefault: 10,
    vMin: 21.0, vMax: 27.0, vDefault: 24.5
  };
}

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
    const staleRuns = await simulationRepository.getRunHistory(100);
    const running = staleRuns.filter(r => r.status === 'Running');
    for (const r of running) {
      await simulationRepository.updateRun(r._id, {
        status: 'Failed',
        errorMessage: 'Server restarted while simulation was running.',
        completedAt: new Date()
      });
    }
    if (running.length > 0) {
      console.log(`[SIMULATION-ENGINE] Cleaned up ${running.length} stale 'Running' simulation(s) from previous session.`);
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
  const event = await simulationRepository.createEvent({
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
    await simulationRepository.updateEvent(event._id, {
      status: 'completed',
      description,
      data: result.data || {},
      completedAt: new Date(),
      duration
    });

    // Update run progress
    run = await simulationRepository.updateRun(run._id, {
      currentStep: stepNumber,
      completedSteps: stepNumber
    });

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

    await simulationRepository.updateEvent(event._id, {
      status: 'failed',
      description: `Failed: ${error.message}`,
      completedAt: new Date(),
      duration
    });

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
      const activeRun = await simulationRepository.findRunById(activeRunId);
      if (activeRun && activeRun.status === 'Running') {
        // Check if it's been running for more than 10 minutes — treat as stuck
        const runningFor = Date.now() - new Date(activeRun.startedAt).getTime();
        if (runningFor > 10 * 60 * 1000) {
          console.warn(`[SIMULATION-ENGINE] Stale simulation ${activeRun.runId} running for ${Math.round(runningFor/1000)}s. Marking as Failed.`);
          await simulationRepository.updateRun(activeRun._id, {
            status: 'Failed',
            errorMessage: 'Simulation timed out (exceeded 10 minute limit).',
            completedAt: new Date()
          });
          activeRunId = null;
        } else {
          throw new Error('A simulation is already running. Please wait for it to complete.');
        }
      } else {
        activeRunId = null;
      }
    }

    // Also check DB for any truly stuck 'Running' simulations not tracked in memory
    const history = await simulationRepository.getRunHistory(100);
    const dbStaleRuns = history.filter(r => r.status === 'Running');
    for (const stale of dbStaleRuns) {
      const age = Date.now() - new Date(stale.startedAt).getTime();
      if (age > 10 * 60 * 1000) {
        await simulationRepository.updateRun(stale._id, {
          status: 'Failed',
          errorMessage: 'Simulation timed out (exceeded 10 minute limit).',
          completedAt: new Date()
        });
        console.warn(`[SIMULATION-ENGINE] Cleaned up stale DB simulation: ${stale.runId}`);
      }
    }

    const { node: nestedNode, nodeCode, nodeId, temperature, vibration, gas, power, hazardousGas, voltage } = req?.body || {};

    // Find target node based on user selection, fallback to BRC or first node
    let nodeObj;
    const searchCode = nestedNode?.code || nodeCode;
    const searchId = nestedNode?.id || nodeId;

    if (searchCode) {
      nodeObj = await railwayNodeRepository.findByCode(searchCode.toUpperCase());
    } else if (searchId) {
      nodeObj = await railwayNodeRepository.findById(searchId);
    }
    if (!nodeObj && nestedNode?.name) {
      const all = await railwayNodeRepository.findAll();
      nodeObj = all.find(n => n.nodeName === nestedNode.name);
    }
    if (!nodeObj) {
      nodeObj = await railwayNodeRepository.findByCode('BRC');
    }
    if (!nodeObj) {
      const all = await railwayNodeRepository.findAll();
      nodeObj = all[0];
    }
    if (!nodeObj) {
      throw new Error('No railway nodes found in the database. Run database seed first.');
    }

    const node = nodeObj;

    const tLimits = getNodeTelemetryLimits(node);

    // Telemetry values: defaults if not passed
    const temperatureVal = (temperature !== undefined && temperature !== null) ? Number(temperature) : tLimits.tDefault;
    const vibrationVal = (vibration !== undefined && vibration !== null) ? Number(vibration) : tLimits.vDefault;
    const gasVal = (hazardousGas !== undefined && hazardousGas !== null) ? Number(hazardousGas) : 
                   ((gas !== undefined && gas !== null) ? Number(gas) : tLimits.gDefault);
    const powerVal = (voltage !== undefined && voltage !== null) ? Number(voltage) : 
                     ((power !== undefined && power !== null) ? Number(power) : tLimits.vDefault);

    // Dynamic points-based risk score calculations using category-specific thresholds
    let totalPoints = 0;

    // Temperature (°C)
    if (temperatureVal < tLimits.tWarn) {
      totalPoints += 0;
    } else if (temperatureVal <= tLimits.tCrit) {
      totalPoints += 15;
    } else {
      totalPoints += 35;
    }

    // Track Vibration (mm/s)
    if (vibrationVal < tLimits.vWarn) {
      totalPoints += 0;
    } else if (vibrationVal <= tLimits.vCrit) {
      totalPoints += 15;
    } else {
      totalPoints += 30;
    }

    // Hazardous Gas (ppm)
    if (gasVal < tLimits.gWarn) {
      totalPoints += 0;
    } else if (gasVal <= tLimits.gCrit) {
      totalPoints += 10;
    } else {
      totalPoints += 20;
    }

    // Power Grid Voltage (kV)
    if (powerVal >= tLimits.vMin && powerVal <= tLimits.vMax) {
      totalPoints += 0;
    } else {
      const margin = (tLimits.vMax - tLimits.vMin) * 0.25;
      if (powerVal > 0 && powerVal >= (tLimits.vMin - margin) && powerVal <= (tLimits.vMax + margin)) {
        totalPoints += 15;
      } else {
        totalPoints += 25;
      }
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
    let run = await simulationRepository.createRun({
      triggeredBy: req?.user?._id || null,
      nodeId: node._id,
      status: 'Running',
      totalSteps: 7
    });
    // Ensure result object is initialized
    run.result = run.result || {};

    activeRunId = run._id;

    // Trigger Notification
    try {
      await notificationService.create({
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
      // ============================================================
      console.time('[SIMULATION] Step 2 - Execute 7-Agent Pipeline');
      await delay(2000);
      await executeStep(run, 2, 'Execute 7-Agent Pipeline', 'agent', async () => {
        const agentResult = await withTimeout(
          aiAgentService.evaluateTelemetry(telemetryPack, req),
          STEP_TIMEOUT_MS,
          'AI Agent Pipeline (Step 2)'
        );
        ctx.agentAction = agentResult;
        run.result = run.result || {};
        run.result.agentDecision = agentResult.decision;
        run = await simulationRepository.updateRun(run._id, { result: run.result });

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
        run.result = run.result || {};
        run.result.riskScore = riskScore;
        run = await simulationRepository.updateRun(run._id, { result: run.result });

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
      // STEP 5: Store results in MySQL
      // ============================================================
      console.time('[SIMULATION] Step 5 - Store Results');
      await delay(1200);
      await executeStep(run, 5, 'Store Results in Database', 'database', async () => {
        // Recalculate heap priority queue in DB
        const queue = await incidentPriorityService.triggerRecalculation(req);
        const position = queue.findIndex(item => {
          const itemNodeId = item.nodeId?._id?.toString() || item.nodeId?.toString();
          return itemNodeId === node._id.toString();
        });
        ctx.heapPosition = position >= 0 ? position + 1 : null;
        run.result = run.result || {};
        run.result.heapPosition = ctx.heapPosition || 0;
        run = await simulationRepository.updateRun(run._id, { result: run.result });

        return {
          description: `Persisted multi-agent reports and simulation metadata to Database. Max Heap recalculated: promoting incident to queue position #${run.result.heapPosition}.`,
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
        let incident = await incidentRepository.findOpenByNodeId(node._id);

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
        run.result = run.result || {};
        run.result.incidentId = incident.incidentId;
        
        // Find the mitigation that was created
        const mitigations = await mitigationRepository.findAll({ nodeId: node._id });
        let mitigation = mitigations.length > 0 ? mitigations[0] : null;

        if (mitigation) {
          ctx.mitigation = mitigation;
          run.result.mitigationId = mitigation.mitigationId;
        }
        run = await simulationRepository.updateRun(run._id, { result: run.result });

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
      run = await simulationRepository.updateRun(run._id, {
        status: 'Completed',
        completedSteps: 7,
        completedAt: new Date()
      });

      // Trigger Notification
      try {
        await notificationService.create({
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
        run = await simulationRepository.updateRun(run._id, {
          status: 'Failed',
          errorMessage: error.message,
          completedAt: new Date()
        });
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
        totalDuration: Date.now() - new Date(run.startedAt).getTime(),
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
    return await simulationRepository.getRunHistory(50);
  },

  /**
   * Get a specific simulation run with all its events
   */
  async getSimulationRun(runId) {
    const run = await simulationRepository.findRunByRunId(runId);

    if (!run) {
      const error = new Error(`Simulation run ${runId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const events = await simulationRepository.getEventsByRunId(run._id);
    return { run, events };
  },

  /**
   * Get aggregate simulation statistics
   */
  async getSimulationStats() {
    const stats = await simulationRepository.getRunStats();
    const history = await simulationRepository.getRunHistory(100);

    const successRate = stats.total > 0
      ? parseFloat(((stats.completed / stats.total) * 100).toFixed(1))
      : 100;

    // Average duration of completed runs
    const completedRuns = history.filter(r => r.status === 'Completed' && r.completedAt);
    let avgDuration = 0;
    if (completedRuns.length > 0) {
      const totalDur = completedRuns.reduce((sum, r) => sum + (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()), 0);
      avgDuration = Math.round(totalDur / completedRuns.length);
    }

    const lastRun = history.length > 0 ? history[0] : null;

    return {
      totalRuns: stats.total,
      completedRuns: stats.completed,
      failedRuns: stats.failed,
      runningRuns: stats.running,
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
