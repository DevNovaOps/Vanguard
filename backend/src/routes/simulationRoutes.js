import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  runSimulation,
  triggerSimulation,
  getHistory,
  getStats,
  getSimulationRun
} from '../controllers/simulationController.js';

const router = express.Router();

/**
 * POST /api/simulation/run
 * Run failure simulation synchronously
 */
router.post(
  '/run',
  authenticateUser,
  (req, res, next) => {
    console.log("ROUTE RECEIVED:", req.body);
    next();
  },
  runSimulation
);

/**
 * POST /api/simulation/trigger
 * Start failure simulation asynchronously
 */
router.post(
  '/trigger',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer'),
  (req, res, next) => {
    console.log("ROUTE RECEIVED:", req.body);
    next();
  },
  triggerSimulation
);

/**
 * GET /api/simulation/history
 */
router.get(
  '/history',
  authenticateUser,
  getHistory
);

/**
 * GET /api/simulation/stats
 */
router.get(
  '/stats',
  authenticateUser,
  getStats
);

/**
 * GET /api/simulation/:runId
 */
router.get(
  '/:runId',
  authenticateUser,
  getSimulationRun
);

export default router;
