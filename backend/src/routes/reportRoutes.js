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

// 1. Infrastructure Reports: Admin, Manager, SafetyOfficer, Operator
router.get('/infrastructure/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getInfrastructurePdf);
router.get('/infrastructure/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getInfrastructureCsv);
router.get('/infrastructure/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getInfrastructureExcel);

// 2. Compliance Reports: Admin, Manager, SafetyOfficer
router.get('/compliance/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getCompliancePdf);
router.get('/compliance/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getComplianceCsv);
router.get('/compliance/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getComplianceExcel);

// 3. Incident Reports: Admin, Manager, SafetyOfficer, Operator
router.get('/incidents/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getIncidentsPdf);
router.get('/incidents/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getIncidentsCsv);
router.get('/incidents/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getIncidentsExcel);

// 4. Risk Reports: Admin, Manager, SafetyOfficer
router.get('/risk/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getRiskPdf);
router.get('/risk/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getRiskCsv);
router.get('/risk/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getRiskExcel);

// 5. Autonomous Actions Reports: Admin, Manager, SafetyOfficer
router.get('/agent/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getAgentPdf);
router.get('/agent/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getAgentCsv);
router.get('/agent/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer'), getAgentExcel);

export default router;
