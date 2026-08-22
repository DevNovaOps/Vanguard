import express from 'express';
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
import validateRequest from '../middleware/validateMiddleware.js';
import { mitigationSchema, statusSchema, executeSchema } from '../validators/mitigationValidator.js';

const router = express.Router();

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
  validateRequest(mitigationSchema),
  createMitigation
);

// Execute mitigation - available to Admin, SafetyOfficer, Operator
router.post(
  '/:id/execute',
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  validateRequest(executeSchema),
  executeMitigation
);

// Update status - restricted to Admin and SafetyOfficer
router.patch(
  '/:id/status',
  authorizeRoles('Admin', 'SafetyOfficer'),
  validateRequest(statusSchema),
  updateMitigationStatus
);

export default router;
