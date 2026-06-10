import express from 'express';
import simulationEngine from '../services/simulationEngine.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post(
  '/trigger',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  async (req, res, next) => {
    try {
      const result = await simulationEngine.triggerSimulation(req);
      res.status(200).json({
        success: true,
        message: 'Simulation triggered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
