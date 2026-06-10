import express from 'express';
import { body } from 'express-validator';
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

const router = express.Router();

// Input Validation Rules for Rules
const ruleValidationRules = [
  body('ruleCode')
    .trim()
    .notEmpty()
    .withMessage('Rule code is required')
    .toUpperCase(),
  body('standard')
    .trim()
    .notEmpty()
    .withMessage('Standard compliance field is required'),
  body('sensorType')
    .trim()
    .isIn([
      'Temperature',
      'Vibration',
      'Pressure',
      'Gas',
      'Humidity',
      'Smoke',
      'Voltage',
      'Current'
    ])
    .withMessage('Sensor type must be one of: Temperature, Vibration, Pressure, Gas, Humidity, Smoke, Voltage, Current'),
  body('minValue')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Minimum value must be a valid number'),
  body('maxValue')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Maximum value must be a valid number'),
  body('severity')
    .trim()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Severity must be Low, Medium, High, or Critical'),
  body('description')
    .optional()
    .trim()
];

const ruleUpdateValidationRules = [
  body('ruleCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Rule code cannot be empty')
    .toUpperCase(),
  body('standard')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Standard field cannot be empty'),
  body('sensorType')
    .optional()
    .trim()
    .isIn([
      'Temperature',
      'Vibration',
      'Pressure',
      'Gas',
      'Humidity',
      'Smoke',
      'Voltage',
      'Current'
    ])
    .withMessage('Sensor type must be one of: Temperature, Vibration, Pressure, Gas, Humidity, Smoke, Voltage, Current'),
  body('minValue')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Minimum value must be a valid number'),
  body('maxValue')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Maximum value must be a valid number'),
  body('severity')
    .optional()
    .trim()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Severity must be Low, Medium, High, or Critical'),
  body('description')
    .optional()
    .trim()
];

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
  ruleValidationRules,
  createRule
);

router.put(
  '/rules/:id',
  authenticateUser,
  authorizeRoles('Admin'),
  ruleUpdateValidationRules,
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
