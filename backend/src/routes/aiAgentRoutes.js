import express from 'express';
import { body } from 'express-validator';
import {
  evaluateTelemetry,
  getActions,
  getActionById,
  getDashboardStats
} from '../controllers/aiAgentController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const evaluateValidation = [
  body('temperature')
    .isNumeric()
    .withMessage('Temperature must be a valid number')
    .notEmpty()
    .withMessage('Temperature is required'),
  body('vibration')
    .isNumeric()
    .withMessage('Vibration must be a valid number')
    .notEmpty()
    .withMessage('Vibration is required'),
  body('gas')
    .isNumeric()
    .withMessage('Gas must be a valid number')
    .notEmpty()
    .withMessage('Gas is required'),
  body('power')
    .isNumeric()
    .withMessage('Power voltage must be a valid number')
    .notEmpty()
    .withMessage('Power voltage is required'),
  body('riskScore')
    .isNumeric()
    .withMessage('Risk score must be a valid number')
    .notEmpty()
    .withMessage('Risk score is required'),
  body('nodeId')
    .isMongoId()
    .withMessage('nodeId must be a valid MongoDB Object ID')
    .notEmpty()
    .withMessage('nodeId is required')
];

// Ingestion and evaluate endpoint: Allowed for Admin, SafetyOfficer, and Operator
router.post(
  '/evaluate',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  evaluateValidation,
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
