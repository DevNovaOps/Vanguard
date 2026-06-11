import express from 'express';
import { getDashboardIncidents, getDashboardAudit } from '../controllers/dashboardController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

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

export default router;
