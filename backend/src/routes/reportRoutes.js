import express from 'express';
import {
  getInfrastructurePdf, getInfrastructureCsv, getInfrastructureExcel,
  getCompliancePdf, getComplianceCsv, getComplianceExcel,
  getIncidentsPdf, getIncidentsCsv, getIncidentsExcel,
  getRiskPdf, getRiskCsv, getRiskExcel,
  getAgentPdf, getAgentCsv, getAgentExcel
} from '../controllers/reportController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// 1. Infrastructure Reports: Admin, Manager
router.get('/infrastructure/pdf', authenticateUser, authorizeRoles('Admin', 'Manager'), getInfrastructurePdf);
router.get('/infrastructure/csv', authenticateUser, authorizeRoles('Admin', 'Manager'), getInfrastructureCsv);
router.get('/infrastructure/excel', authenticateUser, authorizeRoles('Admin', 'Manager'), getInfrastructureExcel);

// 2. Compliance Reports: Admin, Manager, SafetyOfficer
router.get('/compliance/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getCompliancePdf);
router.get('/compliance/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getComplianceCsv);
router.get('/compliance/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getComplianceExcel);

// 3. Incident Reports: Admin, Manager, SafetyOfficer
router.get('/incidents/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getIncidentsPdf);
router.get('/incidents/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getIncidentsCsv);
router.get('/incidents/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getIncidentsExcel);

// 4. Risk Reports: Admin, Manager, SafetyOfficer
router.get('/risk/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getRiskPdf);
router.get('/risk/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getRiskCsv);
router.get('/risk/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getRiskExcel);

// 5. Autonomous Actions Reports: Admin, Manager
router.get('/agent/pdf', authenticateUser, authorizeRoles('Admin', 'Manager'), getAgentPdf);
router.get('/agent/csv', authenticateUser, authorizeRoles('Admin', 'Manager'), getAgentCsv);
router.get('/agent/excel', authenticateUser, authorizeRoles('Admin', 'Manager'), getAgentExcel);

export default router;
