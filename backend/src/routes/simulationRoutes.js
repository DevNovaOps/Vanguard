import express from 'express';
import simulationEngine from '../services/simulationEngine.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import SimulationResult from '../models/SimulationResult.js';
import { runMultiAgentPipeline } from '../utils/pythonRunner.js';

const router = express.Router();

/**
 * POST /api/simulation/run
 * Run failure simulation synchronously, executing the 7-agent pipeline
 * Access: Authenticated users
 */
router.post(
  '/run',
  authenticateUser,
  async (req, res, next) => {
    try {
      const { asset_id, asset_type, failure_type, location } = req.body;

      if (!asset_id || !asset_type || !failure_type || !location) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: asset_id, asset_type, failure_type, location'
        });
      }

      // Generate AI query
      const query = `Analyze simulated ${failure_type.replace(/_/g, ' ')} in ${asset_type} ${asset_id} at ${location}. Determine sensor evidence, similar incidents, RDSO guidance, probable root causes, mitigation actions, and executive recommendations.`;

      console.log(`[SIMULATION-API] Generated query: "${query}"`);

      // Simulated telemetry parameters to trigger thresholds (>60C, >6mm/s)
      const telemetry = {
        temperature: 105,
        vibration: 8.5,
        gas: 15,
        power: 24,
        risk_score: 95
      };

      // Run python multi-agent pipeline
      const pipelineResult = await runMultiAgentPipeline(query, telemetry);

      // Map risk level to uppercase
      const rawRiskLevel = pipelineResult.risk_level || 'CRITICAL';
      const risk_level = rawRiskLevel.toUpperCase();

      // Create and save SimulationResult
      const resultDoc = new SimulationResult({
        asset_id,
        asset_type,
        location,
        failure_type,
        query,
        retrieval_results: pipelineResult.retrieval_results || '',
        sensor_evidence: pipelineResult.sensor_evidence || '',
        historical_incidents: pipelineResult.historical_incidents || '',
        rdso_guidance: pipelineResult.rdso_guidance || '',
        root_causes: pipelineResult.root_causes || '',
        mitigation_actions: pipelineResult.mitigation_actions || '',
        executive_summary: pipelineResult.executive_summary || '',
        risk_level
      });

      await resultDoc.save();

      res.status(200).json({
        success: true,
        message: 'Simulation completed and saved successfully',
        data: resultDoc
      });
    } catch (error) {
      console.error('[SIMULATION-API] Error running simulation:', error);
      next(error);
    }
  }
);

/**
 * POST /api/simulation/trigger
 * Start a new full 9-step failure simulation
 * Access: Admin, SafetyOfficer
 */
router.post(
  '/trigger',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer'),
  async (req, res, next) => {
    try {
      // Start simulation asynchronously (don't await full completion)
      // The simulation runs in the background and emits Socket.IO events
      const runPromise = simulationEngine.runFullSimulation(req);

      // Wait briefly for the run to be created, then return immediately
      const run = await Promise.race([
        runPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 2000))
      ]);

      // If simulation completed within 2s (unlikely for 9 steps), return full result
      if (run) {
        return res.status(200).json({
          success: true,
          message: 'Simulation completed',
          data: run
        });
      }

      // Otherwise, return the initial run info
      // The simulation is still running in the background
      // Detach the promise to avoid unhandled rejection
      runPromise.catch(err => {
        console.error(`[SIMULATION-ROUTE] Background simulation failed: ${err.message}`);
      });

      res.status(202).json({
        success: true,
        message: 'Simulation triggered successfully. Monitor progress via Socket.IO events.',
        data: { status: 'Running' }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/simulation/history
 * List past simulation runs
 * Access: All authenticated users
 */
router.get(
  '/history',
  authenticateUser,
  async (req, res, next) => {
    try {
      const history = await simulationEngine.getSimulationHistory();
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/simulation/stats
 * Get aggregate simulation statistics
 * Access: All authenticated users
 */
router.get(
  '/stats',
  authenticateUser,
  async (req, res, next) => {
    try {
      const stats = await simulationEngine.getSimulationStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/simulation/:runId
 * Get a specific simulation run with events
 * Access: All authenticated users
 */
router.get(
  '/:runId',
  authenticateUser,
  async (req, res, next) => {
    try {
      const result = await simulationEngine.getSimulationRun(req.params.runId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
