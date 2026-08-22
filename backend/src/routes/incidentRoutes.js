import express from 'express';
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
import validateRequest from '../middleware/validateMiddleware.js';
import { incidentSchema, updateIncidentSchema } from '../validators/incidentValidator.js';

const router = express.Router();

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
router.post('/', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), validateRequest(incidentSchema), createIncident);
router.patch('/:id', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), validateRequest(updateIncidentSchema), updateIncident);
router.patch('/:id/resolve', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), resolveIncident);
router.patch('/:id/close', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), closeIncident);
router.patch('/:id/assign', authorizeRoles('Admin', 'SafetyOfficer', 'Operator'), assignTeam);

export default router;
