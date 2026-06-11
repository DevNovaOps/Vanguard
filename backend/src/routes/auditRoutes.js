import express from 'express';
import {
  getAuditLogsController,
  getAuditLogByIdController,
  getAuditStatsController,
  getAuditLogsByModuleController,
  getAuditLogsBySeverityController,
  exportAuditLogsController
} from '../controllers/auditController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All audit routes are private and restricted to Admins and Safety Officers
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'SafetyOfficer'));

router.get('/', getAuditLogsController);
router.get('/stats', getAuditStatsController);
router.get('/export', exportAuditLogsController);
router.get('/module/:module', getAuditLogsByModuleController);
router.get('/severity/:severity', getAuditLogsBySeverityController);
router.get('/:id', getAuditLogByIdController);

export default router;
