import express from 'express';
import { getDashboardIncidents, getDashboardAudit, getDashboardWebhooks, getDashboardStats } from '../controllers/dashboardController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get(
  '/stats',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'),
  getDashboardStats
);

router.get(
  '/incidents',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'),
  getDashboardIncidents
);

router.get(
  '/audit',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'),
  getDashboardAudit
);

router.get(
  '/webhooks',
  authenticateUser,
  authorizeRoles('Admin', 'SafetyOfficer', 'Operator', 'Manager'),
  getDashboardWebhooks
);

export default router;
