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

// 1. Infrastructure Reports: Admin, Manager, Operator
router.get('/infrastructure/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'Operator'), getInfrastructurePdf);
router.get('/infrastructure/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'Operator'), getInfrastructureCsv);
router.get('/infrastructure/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'Operator'), getInfrastructureExcel);

// 2. Compliance Reports: Admin, Manager, SafetyOfficer, Operator
router.get('/compliance/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getCompliancePdf);
router.get('/compliance/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getComplianceCsv);
router.get('/compliance/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getComplianceExcel);

// 3. Incident Reports: Admin, Manager, SafetyOfficer, Operator
router.get('/incidents/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getIncidentsPdf);
router.get('/incidents/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getIncidentsCsv);
router.get('/incidents/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getIncidentsExcel);

// 4. Risk Reports: Admin, Manager, SafetyOfficer, Operator
router.get('/risk/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getRiskPdf);
router.get('/risk/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getRiskCsv);
router.get('/risk/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'SafetyOfficer', 'Operator'), getRiskExcel);

// 5. Autonomous Actions Reports: Admin, Manager, Operator
router.get('/agent/pdf', authenticateUser, authorizeRoles('Admin', 'Manager', 'Operator'), getAgentPdf);
router.get('/agent/csv', authenticateUser, authorizeRoles('Admin', 'Manager', 'Operator'), getAgentCsv);
router.get('/agent/excel', authenticateUser, authorizeRoles('Admin', 'Manager', 'Operator'), getAgentExcel);

export default router;
