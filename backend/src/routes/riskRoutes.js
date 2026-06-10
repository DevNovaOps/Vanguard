import express from 'express';
import {
  getRisks,
  getRiskByNodeId,
  calculateAllRisks,
  getDashboardStats
} from '../controllers/riskController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Read operations: Allowed for Admin, SafetyOfficer, Manager, and Operator
router.get(
  '/',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getRisks
);

router.get(
  '/dashboard',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getDashboardStats
);

router.get(
  '/:nodeId',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getRiskByNodeId
);

// Trigger Risk Recalculation: Allowed only for Admin and SafetyOfficer
router.post(
  '/calculate',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer'),
  calculateAllRisks
);

export default router;
