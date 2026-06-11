import express from 'express';
import simulationEngine from '../services/simulationEngine.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

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
