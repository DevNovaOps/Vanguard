import express from 'express';
import {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  getViolations,
  getViolationById,
  getDashboardStats
} from '../controllers/complianceController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateMiddleware.js';
import { ruleSchema, updateRuleSchema } from '../validators/complianceValidator.js';

const router = express.Router();

// --- Dashboard Endpoint ---
// Manager, Admin, and SafetyOfficer can view Dashboard statistics
router.get(
  '/dashboard',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager'),
  getDashboardStats
);

// --- Compliance Rules Endpoints ---
// Admin and SafetyOfficer can read rules
router.get(
  '/rules',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer'),
  getRules
);

router.get(
  '/rules/:id',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer'),
  getRuleById
);

// Only Admin can write rules
router.post(
  '/rules',
  authenticateUser,
  authorizeRoles('Admin'),
  validateRequest(ruleSchema),
  createRule
);

router.put(
  '/rules/:id',
  authenticateUser,
  authorizeRoles('Admin'),
  validateRequest(updateRuleSchema),
  updateRule
);

router.delete(
  '/rules/:id',
  authenticateUser,
  authorizeRoles('Admin'),
  deleteRule
);

// --- Compliance Violations Endpoints ---
// Admin, SafetyOfficer, and Operator can read violations
router.get(
  '/violations',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  getViolations
);

router.get(
  '/violations/:id',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator'),
  getViolationById
);

export default router;
