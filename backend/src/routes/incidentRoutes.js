import express from 'express';
import { body } from 'express-validator';
import {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  resolveIncident,
  closeIncident,
  assignTeam,
  getOpenIncidents,
  getCriticalIncidents
} from '../controllers/incidentController.js';
import {
  getPrioritizedQueue,
  getIncidentPriorityRank,
  getPriorityDashboard
} from '../controllers/incidentPriorityController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const incidentValidationRules = [
  body('nodeId')
    .isMongoId()
    .withMessage('Node ID must be a valid MongoDB ObjectId'),
  body('riskScore')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Risk score must be a number between 0 and 100'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Incident title is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Incident description is required'),
  body('source')
    .trim()
    .isIn(['Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent'])
    .withMessage('Source must be Telemetry, Compliance, Simulation, Manual, or Agent'),
  body('status')
    .optional()
    .isIn(['Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed'])
    .withMessage('Status must be Open, Investigating, Mitigating, Resolved, or Closed'),
  body('assignedTeam')
    .optional({ nullable: true })
    .trim()
];

const incidentUpdateRules = [
  body('nodeId')
    .optional()
    .isMongoId()
    .withMessage('Node ID must be a valid MongoDB ObjectId'),
  body('riskScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Risk score must be a number between 0 and 100'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Incident title cannot be empty'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Incident description cannot be empty'),
  body('source')
    .optional()
    .trim()
    .isIn(['Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent'])
    .withMessage('Source must be Telemetry, Compliance, Simulation, Manual, or Agent'),
  body('status')
    .optional()
    .isIn(['Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed'])
    .withMessage('Status must be Open, Investigating, Mitigating, Resolved, or Closed')
];

// Apply auth to all endpoints
router.use(authenticateUser);

// Read-only queries (accessible to all roles: Admin, SafetyOfficer, Operator, Manager)
router.get('/', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getAllIncidents);
router.get('/open', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getOpenIncidents);
router.get('/critical', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getCriticalIncidents);
router.get('/prioritized', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getPrioritizedQueue);
router.get('/priority-dashboard', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getPriorityDashboard);
router.get('/priority/:id', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getIncidentPriorityRank);
router.get('/:id', authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'), getIncidentById);

// Write/Mutation queries (restricted to Admin, SafetyOfficer, Operator)
router.post('/', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), incidentValidationRules, createIncident);
router.patch('/:id', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), incidentUpdateRules, updateIncident);
router.patch('/:id/resolve', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), resolveIncident);
router.patch('/:id/close', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), closeIncident);
router.patch('/:id/assign', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), assignTeam);

export default router;
