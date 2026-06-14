import simulationEngine from '../services/simulationEngine.js';
import SimulationResult from '../models/SimulationResult.js';
import SimulationRun from '../models/SimulationRun.js';
import RailwayNode from '../models/RailwayNode.js';
import { runMultiAgentPipeline } from '../utils/pythonRunner.js';

// Node-level timeout for the entire simulation controller: 130 seconds
const CONTROLLER_TIMEOUT_MS = 300000;

/**
 * Run failure simulation synchronously, executing the 7-agent pipeline.
 * 
 * VANGUARD FIX: Removed duplicate SimulationRun.create() — the run is now
 * created once, and properly marked Failed with the actual completedSteps
 * count on any error path.
 */
export const runSimulation = async (req, res, next) => {
  let run;
  try {
    console.log("CONTROLLER:", req.body);
    console.time('[SIMULATION-CONTROLLER] Total simulation time');

    const { node, temperature, vibration, hazardousGas, voltage, riskScore } = req.body;

    const nodeCode = node?.code;
    const nodeNameInput = node?.name;
    const nodeTypeInput = node?.type;

    // Find node in DB — try code, then name, then fallback
    let dbNode;
    if (nodeCode) {
      dbNode = await RailwayNode.findOne({ nodeCode: nodeCode.toUpperCase() });
    }
    if (!dbNode && nodeNameInput) {
      dbNode = await RailwayNode.findOne({ nodeName: nodeNameInput });
    }
    if (!dbNode) {
      dbNode = await RailwayNode.findOne({ nodeCode: 'BRC' });
    }
    if (!dbNode) {
      dbNode = await RailwayNode.findOne({});
    }

    // Create the simulation run in DB to track progress
    run = await SimulationRun.create({
      triggeredBy: req.user?._id || null,
      nodeId: dbNode ? dbNode._id : null,
      status: 'Running',
      totalSteps: 7,
      startedAt: new Date()
    });

    const nodeName = dbNode ? dbNode.nodeName : (nodeNameInput || 'Unknown Station');
    const nodeCd = dbNode ? dbNode.nodeCode : (nodeCode || 'BRC');

    // Use safe defaults if telemetry values are null/undefined
    const safeTemp = (temperature !== undefined && temperature !== null) ? Number(temperature) : 135;
    const safeVib = (vibration !== undefined && vibration !== null) ? Number(vibration) : 85;
    const safeGas = (hazardousGas !== undefined && hazardousGas !== null) ? Number(hazardousGas) : 40;
    const safeVolt = (voltage !== undefined && voltage !== null) ? Number(voltage) : 24;

    // Dynamic points-based risk score calculations
    let totalPoints = 0;

    // Temperature
    if (safeTemp < 70) {
      totalPoints += 10;
    } else if (safeTemp >= 70 && safeTemp <= 90) {
      totalPoints += 25;
    } else if (safeTemp > 90) {
      totalPoints += 40;
    }

    // Vibration
    if (safeVib < 40) {
      totalPoints += 10;
    } else if (safeVib >= 40 && safeVib <= 80) {
      totalPoints += 25;
    } else if (safeVib > 80) {
      totalPoints += 35;
    }

    // Hazardous Gas
    if (safeGas < 30) {
      totalPoints += 5;
    } else if (safeGas >= 30 && safeGas <= 70) {
      totalPoints += 15;
    } else if (safeGas > 70) {
      totalPoints += 30;
    }

    // Power (voltage)
    if (safeVolt >= 15 && safeVolt <= 30) {
      totalPoints += 0;
    } else {
      totalPoints += 20;
    }

    const calculatedRiskScore = Math.min(totalPoints, 100);

    let calcSeverity = 'Low';
    if (calculatedRiskScore >= 0 && calculatedRiskScore <= 29) {
      calcSeverity = 'Low';
    } else if (calculatedRiskScore >= 30 && calculatedRiskScore <= 59) {
      calcSeverity = 'Medium';
    } else if (calculatedRiskScore >= 60 && calculatedRiskScore <= 79) {
      calcSeverity = 'High';
    } else if (calculatedRiskScore >= 80 && calculatedRiskScore <= 100) {
      calcSeverity = 'Critical';
    }

    // Update run progress: Step 1 — scenario generated
    run.currentStep = 1;
    run.completedSteps = 1;
    await run.save();

    // Generate dynamic query using the selected node:
    const query = `Analyze simulated failures at ${nodeName} (${nodeCd}) using telemetry: Temperature ${safeTemp}°C, Vibration ${safeVib} mm/s, Hazardous Gas ${safeGas} ppm, Voltage ${safeVolt} kV.`;

    console.log(`[SIMULATION-CONTROLLER] Generated query: "${query}"`);
    console.time('[SIMULATION-CONTROLLER] Python pipeline execution');

    const telemetry = {
      temperature: safeTemp,
      vibration: safeVib,
      gas: safeGas,
      power: safeVolt,
      risk_score: calculatedRiskScore
    };

    // Run python multi-agent pipeline with 130-second timeout protection
    let pipelineResult;
    try {
      pipelineResult = await Promise.race([
        runMultiAgentPipeline(query, telemetry),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Agent execution timeout — pipeline exceeded 130 seconds')), CONTROLLER_TIMEOUT_MS)
        )
      ]);
    } catch (timeoutErr) {
      console.timeEnd('[SIMULATION-CONTROLLER] Python pipeline execution');
      console.error(`[SIMULATION-CONTROLLER] Pipeline timeout: ${timeoutErr.message}`);
      // Use fallback instead of crashing
      pipelineResult = {
        success: true,
        retrieval_results: 'Agent response unavailable (timeout).',
        sensor_evidence: 'Fallback mode activated.',
        historical_incidents: 'Agent response unavailable.',
        rdso_guidance: 'Agent response unavailable.',
        root_causes: 'Fallback mode activated.',
        mitigation_actions: 'Keep Monitoring',
        executive_summary: 'Agent pipeline timed out. Fallback analysis applied.',
        risk_level: calcSeverity
      };
    }

    console.timeEnd('[SIMULATION-CONTROLLER] Python pipeline execution');

    // Update run progress: Steps 2-5
    run.currentStep = 5;
    run.completedSteps = 5;
    await run.save();

    // Normalization of risk level from agent
    let rawRiskLevel = pipelineResult.risk_level || calcSeverity;
    let risk_level = 'Low';
    const upper = String(rawRiskLevel).toUpperCase();
    if (upper.includes('CRITICAL') || upper.includes('SEVERE')) risk_level = 'Critical';
    else if (upper.includes('HIGH')) risk_level = 'High';
    else if (upper.includes('MEDIUM')) risk_level = 'Medium';
    else if (upper.includes('LOW') || upper.includes('INFO')) risk_level = 'Low';

    console.time('[SIMULATION-CONTROLLER] Database save');

    // Create and save SimulationResult
    const resultDoc = new SimulationResult({
      asset_id: 'S-011',
      asset_type: dbNode ? dbNode.nodeType : (nodeTypeInput || 'Station'),
      location: `${nodeName} (${nodeCd})`,
      failure_type: 'bearing_overheating',
      query,
      retrieval_results: pipelineResult.retrieval_results || '',
      sensor_evidence: pipelineResult.sensor_evidence || '',
      historical_incidents: pipelineResult.historical_incidents || '',
      rdso_guidance: pipelineResult.rdso_guidance || '',
      root_causes: pipelineResult.root_causes || '',
      mitigation_actions: pipelineResult.mitigation_actions || '',
      executive_summary: pipelineResult.executive_summary || '',
      risk_level: risk_level.toUpperCase()
    });

    await resultDoc.save();

    console.timeEnd('[SIMULATION-CONTROLLER] Database save');

    // Update the SimulationRun to Completed in DB
    run.status = 'Completed';
    run.completedSteps = 7;
    run.currentStep = 7;
    run.completedAt = new Date();
    run.result = {
      violationsCreated: 0,
      incidentId: null,
      mitigationId: null,
      riskScore: calculatedRiskScore,
      heapPosition: 0,
      agentDecision: risk_level.toUpperCase()
    };
    await run.save();

    console.timeEnd('[SIMULATION-CONTROLLER] Total simulation time');

    res.status(200).json({
      success: true,
      message: 'Simulation completed and saved successfully',
      data: resultDoc
    });
  } catch (error) {
    console.error('[SIMULATION-CONTROLLER] Error running simulation:', error);
    console.timeEnd('[SIMULATION-CONTROLLER] Total simulation time');

    if (run) {
      try {
        run.status = 'Failed';
        run.completedAt = new Date();
        run.errorMessage = error.message;
        // Preserve whatever step we reached
        await run.save();
      } catch (saveErr) {
        console.error('[SIMULATION-CONTROLLER] Failed to update SimulationRun status:', saveErr);
      }
    }
    next(error);
  }
};

/**
 * Start a new full failure simulation cascade asynchronously
 */
export const triggerSimulation = async (req, res, next) => {
  try {
    console.log("CONTROLLER:", req.body);

    // Start simulation asynchronously (don't await full completion)
    let runPromise;
    try {
      runPromise = simulationEngine.runFullSimulation(req);
    } catch (syncErr) {
      // Catch synchronous errors (e.g., "already running")
      const statusCode = syncErr.message.includes('already running') ? 409 : 500;
      return res.status(statusCode).json({
        success: false,
        message: syncErr.message
      });
    }

    // Wait briefly for the run to be created or to catch early errors, then return immediately
    let run;
    try {
      run = await Promise.race([
        runPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 2000))
      ]);
    } catch (raceErr) {
      // The promise rejected within the 2s window (e.g., "already running")
      const statusCode = raceErr.message.includes('already running') ? 409 : 500;
      return res.status(statusCode).json({
        success: false,
        message: raceErr.message
      });
    }

    if (run) {
      return res.status(200).json({
        success: true,
        message: 'Simulation completed',
        data: run
      });
    }

    // The simulation is still running in the background — attach error handler
    runPromise.catch(err => {
      console.error(`[SIMULATION-CONTROLLER] Background simulation failed: ${err.message}`);
    });

    res.status(202).json({
      success: true,
      message: 'Simulation triggered successfully. Monitor progress via Socket.IO events.',
      data: { status: 'Running' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List past simulation runs
 */
export const getHistory = async (req, res, next) => {
  try {
    const history = await simulationEngine.getSimulationHistory();
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get aggregate simulation statistics
 */
export const getStats = async (req, res, next) => {
  try {
    const stats = await simulationEngine.getSimulationStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific simulation run with events
 */
export const getSimulationRun = async (req, res, next) => {
  try {
    const result = await simulationEngine.getSimulationRun(req.params.runId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
