import express from 'express';
import {
  evaluateTelemetry,
  getActions,
  getActionById,
  getDashboardStats
} from '../controllers/aiAgentController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateMiddleware.js';
import { evaluateSchema } from '../validators/aiAgentValidator.js';

const router = express.Router();

// Ingestion and evaluate endpoint: Allowed for Admin, SafetyOfficer, and Operator
router.post(
  '/evaluate',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  validateRequest(evaluateSchema),
  evaluateTelemetry
);

// Fetching historical action logs: Allowed for Admin, SafetyOfficer, and Operator
router.get(
  '/actions',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  getActions
);

router.get(
  '/actions/:id',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  getActionById
);

// Stats dashboard endpoint: Allowed for Admin and Manager
router.get(
  '/dashboard',
  authenticateUser,
  authorizeRoles('Admin', 'Manager'),
  getDashboardStats
);

export default router;
