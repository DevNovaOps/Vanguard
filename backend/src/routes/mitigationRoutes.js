import express from 'express';
import { body } from 'express-validator';
import {
  getAllMitigations,
  getMitigationById,
  createMitigation,
  updateMitigationStatus,
  executeMitigation,
  getDashboardStats
} from '../controllers/mitigationController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const mitigationValidationRules = [
  body('incidentId')
    .isMongoId()
    .withMessage('Incident ID must be a valid MongoDB ObjectId'),
  body('nodeId')
    .isMongoId()
    .withMessage('Node ID must be a valid MongoDB ObjectId'),
  body('action')
    .trim()
    .isIn([
      'Emergency Brake',
      'Emergency Speed Restriction',
      'Power Rerouting',
      'Route Isolation',
      'Infrastructure Shutdown',
      'Maintenance Dispatch',
      'Ventilation Activation',
      'Safety Escalation'
    ])
    .withMessage('Invalid action type specified'),
  body('severity')
    .trim()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Severity must be Low, Medium, High, or Critical'),
  body('executionNotes')
    .optional()
    .trim()
];

const statusValidationRules = [
  body('status')
    .trim()
    .isIn(['Pending', 'InProgress', 'Executed', 'Completed', 'Failed', 'Cancelled'])
    .withMessage('Status must be Pending, InProgress, Executed, Completed, Failed, or Cancelled'),
  body('executionNotes')
    .optional()
    .trim()
];

// All routes are private and require user login
router.use(authenticateUser);

// Dashboard stats - available to Admin, SafetyOfficer, Operator, and Manager
router.get(
  '/dashboard',
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'),
  getDashboardStats
);

// Read mitigations - available to Admin, SafetyOfficer, Operator
router.get(
  '/',
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  getAllMitigations
);

router.get(
  '/:id',
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  getMitigationById
);

// Create manual mitigation - available to Admin, SafetyOfficer, Operator
router.post(
  '/',
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  mitigationValidationRules,
  createMitigation
);

// Execute mitigation - available to Admin, SafetyOfficer, Operator
router.post(
  '/:id/execute',
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  body('executionNotes').optional().trim(),
  executeMitigation
);

// Update status - restricted to Admin and SafetyOfficer
router.patch(
  '/:id/status',
  authorizeRoles('Admin', 'SafetyOfficer'),
  statusValidationRules,
  updateMitigationStatus
);

export default router;
