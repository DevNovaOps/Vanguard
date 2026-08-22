import express from 'express';
import {
  getExecutiveSummary,
  getDigitalTwin,
  getPredictiveMaintenance,
  askAiAgent,
  getWorkOrders,
  getMaintenanceCosts,
  getTrainHealth
} from '../controllers/commandCenterController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require authentication for all command center routes
router.use(protect);

router.get('/executive-summary', getExecutiveSummary);
router.get('/digital-twin', getDigitalTwin);
router.get('/predictive-maintenance', getPredictiveMaintenance);
router.post('/chat', askAiAgent);
router.get('/work-orders', getWorkOrders);
router.get('/maintenance-costs', getMaintenanceCosts);
router.get('/train-health', getTrainHealth);

export default router;
