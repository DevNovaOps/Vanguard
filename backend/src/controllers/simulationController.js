import simulationEngine from '../services/simulationEngine.js';
import simulationRepository from '../repositories/simulationRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
import { runMultiAgentPipeline } from '../utils/pythonRunner.js';

// Node-level timeout for the entire simulation controller: 130 seconds
const CONTROLLER_TIMEOUT_MS = 300000;

function getNodeTelemetryLimits(node) {
  const name = String(node?.nodeName || node?.name || '').toLowerCase();
  const type = String(node?.nodeType || node?.type || '').toLowerCase();

  // 1. Line Locking & Block Section Locking
  if (name.includes('line locking') || name.includes('linelocking') || name.includes('line lock') || name.includes('block locking') || name.includes('auto block')) {
    return {
      tWarn: 40, tCrit: 55, tDefault: 28,
      vWarn: 2.0, vCrit: 4.0, vDefault: 1.0,
      gWarn: 15, gCrit: 30, gDefault: 5,
      vMin: 0.10, vMax: 3.5, vDefault: 0.23
    };
  }

  // 2. Interlocking Cabin / RRI / Signal Tower / Cabin
  if (name.includes('interlocking') || name.includes('rri') || name.includes('cabin') || name.includes('signal') || type.includes('signal')) {
    return {
      tWarn: 35, tCrit: 45, tDefault: 24,
      vWarn: 1.5, vCrit: 3.5, vDefault: 0.8,
      gWarn: 15, gCrit: 30, gDefault: 8,
      vMin: 0.10, vMax: 3.5, vDefault: 0.23
    };
  }

  // 3. Electric & Diesel Loco Shed (ELS/DLS)
  if (name.includes('loco shed') || name.includes('els') || name.includes('dls') || name.includes('electric loco') || name.includes('diesel loco')) {
    return {
      tWarn: 55, tCrit: 75, tDefault: 38,
      vWarn: 4.0, vCrit: 8.0, vDefault: 2.8,
      gWarn: 30, gCrit: 60, gDefault: 18,
      vMin: 3.0, vMax: 15.0, vDefault: 11.0
    };
  }

  // 4. Port Rail Terminals & Freight Hubs
  if (name.includes('port rail') || name.includes('port terminal') || name.includes('terminal')) {
    return {
      tWarn: 50, tCrit: 65, tDefault: 36,
      vWarn: 4.5, vCrit: 9.0, vDefault: 3.2,
      gWarn: 25, gCrit: 50, gDefault: 16,
      vMin: 3.0, vMax: 15.0, vDefault: 11.0
    };
  }

  // 5. Marshalling Yards & Container Freight Yards
  if (name.includes('marshalling yard') || name.includes('freight yard') || name.includes('container freight') || name.includes('yard')) {
    return {
      tWarn: 55, tCrit: 70, tDefault: 37,
      vWarn: 5.0, vCrit: 10.0, vDefault: 3.8,
      gWarn: 30, gCrit: 60, gDefault: 20,
      vMin: 3.0, vMax: 11.5, vDefault: 6.6
    };
  }

  // 6. Outer Post / Gate / Block Post / Level Crossing
  if (name.includes('post') || name.includes('outer') || name.includes('gate') || name.includes('crossing') || name.includes('block')) {
    return {
      tWarn: 45, tCrit: 60, tDefault: 32,
      vWarn: 2.5, vCrit: 5.0, vDefault: 1.2,
      gWarn: 20, gCrit: 40, gDefault: 12,
      vMin: 0.10, vMax: 3.5, vDefault: 0.23
    };
  }

  // 7. Freight / Goodshed / Industrial Siding
  if (name.includes('siding') || name.includes('goodshed') || name.includes('industrial') || type.includes('siding')) {
    return {
      tWarn: 50, tCrit: 65, tDefault: 38,
      vWarn: 6.0, vCrit: 12.0, vDefault: 3.5,
      gWarn: 35, gCrit: 70, gDefault: 18,
      vMin: 3.0, vMax: 11.5, vDefault: 6.6
    };
  }

  // 8. Traction Substation / Power Hub
  if (name.includes('substation') || name.includes('power hub') || name.includes('tss') || name.includes('traction power') || type.includes('power_hub')) {
    return {
      tWarn: 65, tCrit: 85, tDefault: 45,
      vWarn: 3.0, vCrit: 6.0, vDefault: 1.5,
      gWarn: 20, gCrit: 40, gDefault: 10,
      vMin: 21.0, vMax: 27.0, vDefault: 24.5
    };
  }

  // 9. Maintenance Depot / Workshop
  if (name.includes('depot') || name.includes('workshop') || type.includes('depot')) {
    return {
      tWarn: 50, tCrit: 70, tDefault: 40,
      vWarn: 4.5, vCrit: 9.0, vDefault: 3.0,
      gWarn: 25, gCrit: 50, gDefault: 15,
      vMin: 3.0, vMax: 15.0, vDefault: 11.0
    };
  }

  // 10. Default: Main Line Junction / Station
  return {
    tWarn: 60, tCrit: 80, tDefault: 42,
    vWarn: 4.0, vCrit: 7.5, vDefault: 2.2,
    gWarn: 25, gCrit: 50, gDefault: 10,
    vMin: 21.0, vMax: 27.0, vDefault: 24.5
  };
}

/**
 * Run failure simulation synchronously, executing the 7-agent pipeline.
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
      dbNode = await railwayNodeRepository.findByCode(nodeCode.toUpperCase());
    }
    if (!dbNode && nodeNameInput) {
      dbNode = await railwayNodeRepository.findByName(nodeNameInput);
    }
    if (!dbNode) {
      dbNode = await railwayNodeRepository.findByCode('BRC');
    }
    if (!dbNode) {
      const allNodes = await railwayNodeRepository.findAll();
      if (allNodes.length > 0) dbNode = allNodes[0];
    }

    // Create the simulation run in DB to track progress
    run = await simulationRepository.createRun({
      triggeredBy: req.user?._id || null,
      nodeId: dbNode ? dbNode._id : null,
      status: 'Running',
      totalSteps: 7,
      completedSteps: 0,
      currentStep: 0
    });

    const nodeName = dbNode ? dbNode.nodeName : (nodeNameInput || 'Unknown Station');
    const nodeCd = dbNode ? dbNode.nodeCode : (nodeCode || 'BRC');

    const tLimits = getNodeTelemetryLimits(dbNode || { nodeName, nodeType: nodeTypeInput });

    // Use category safe defaults if telemetry values are null/undefined
    const safeTemp = (temperature !== undefined && temperature !== null) ? Number(temperature) : tLimits.tDefault;
    const safeVib = (vibration !== undefined && vibration !== null) ? Number(vibration) : tLimits.vDefault;
    const safeGas = (hazardousGas !== undefined && hazardousGas !== null) ? Number(hazardousGas) : tLimits.gDefault;
    const safeVolt = (voltage !== undefined && voltage !== null) ? Number(voltage) : tLimits.vDefault;

    // Dynamic points-based risk score calculations using category-specific thresholds
    let totalPoints = 0;

    // Temperature (°C)
    if (safeTemp < tLimits.tWarn) {
      totalPoints += 0;
    } else if (safeTemp <= tLimits.tCrit) {
      totalPoints += 15;
    } else {
      totalPoints += 35;
    }

    // Track Vibration (mm/s)
    if (safeVib < tLimits.vWarn) {
      totalPoints += 0;
    } else if (safeVib <= tLimits.vCrit) {
      totalPoints += 15;
    } else {
      totalPoints += 30;
    }

    // Hazardous Gas (ppm)
    if (safeGas < tLimits.gWarn) {
      totalPoints += 0;
    } else if (safeGas <= tLimits.gCrit) {
      totalPoints += 10;
    } else {
      totalPoints += 20;
    }

    // Power Grid Voltage (kV)
    if (safeVolt >= tLimits.vMin && safeVolt <= tLimits.vMax) {
      totalPoints += 0;
    } else {
      const margin = (tLimits.vMax - tLimits.vMin) * 0.25;
      if (safeVolt > 0 && safeVolt >= (tLimits.vMin - margin) && safeVolt <= (tLimits.vMax + margin)) {
        totalPoints += 15;
      } else {
        totalPoints += 25;
      }
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
    run = await simulationRepository.updateRun(run._id, { currentStep: 1, completedSteps: 1 });

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

    // Run python multi-agent pipeline with timeout protection
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
    run = await simulationRepository.updateRun(run._id, { currentStep: 5, completedSteps: 5 });

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
    const resultDoc = await simulationRepository.createResult({
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

    console.timeEnd('[SIMULATION-CONTROLLER] Database save');

    // Update the SimulationRun to Completed in DB
    run = await simulationRepository.updateRun(run._id, {
      status: 'Completed',
      completedSteps: 7,
      currentStep: 7,
      completedAt: new Date(),
      result: {
        violationsCreated: 0,
        incidentId: null,
        mitigationId: null,
        riskScore: calculatedRiskScore,
        heapPosition: 0,
        agentDecision: risk_level.toUpperCase()
      }
    });

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
        await simulationRepository.updateRun(run._id, {
          status: 'Failed',
          completedAt: new Date(),
          errorMessage: error.message
        });
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
