import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import assert from 'assert';
import http from 'http';
import dns from 'dns';
import { Writable } from 'stream';

// Setup DNS servers to Google DNS for reliable SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environmental variables relative to tests directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Models
import RailwayNode from '../src/models/RailwayNode.js';
import User from '../src/models/User.js';
import ComplianceRule from '../src/models/ComplianceRule.js';
import ComplianceViolation from '../src/models/ComplianceViolation.js';
import Incident from '../src/models/Incident.js';
import Mitigation from '../src/models/Mitigation.js';
import AuditLog from '../src/models/AuditLog.js';
import AgentAction from '../src/models/AgentAction.js';
import RiskScore from '../src/models/RiskScore.js';

// Import Controller functions
import {
  getInfrastructurePdf, getInfrastructureCsv, getInfrastructureExcel,
  getCompliancePdf, getComplianceCsv, getComplianceExcel,
  getIncidentsPdf, getIncidentsCsv, getIncidentsExcel,
  getRiskPdf, getRiskCsv, getRiskExcel,
  getAgentPdf, getAgentCsv, getAgentExcel
} from '../src/controllers/reportController.js';

import reportService from '../src/services/reportService.js';
import router from '../src/routes/reportRoutes.js';

// Mock Response Writable stream class to capture bytes written by PDFKit / ExcelJS
class MockResponse extends Writable {
  constructor() {
    super();
    this.headers = {};
    this.statusCode = 200;
    this.body = Buffer.alloc(0);
    this.isEnded = false;
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  _write(chunk, encoding, callback) {
    this.body = Buffer.concat([this.body, chunk]);
    callback();
  }

  end(chunk) {
    if (chunk) {
      if (Buffer.isBuffer(chunk)) {
        this.body = Buffer.concat([this.body, chunk]);
      } else {
        this.body = Buffer.concat([this.body, Buffer.from(chunk)]);
      }
    }
    this.isEnded = true;
    this.emit('finish');
  }

  send(data) {
    if (Buffer.isBuffer(data)) {
      this.body = data;
    } else if (typeof data === 'object') {
      this.body = Buffer.from(JSON.stringify(data));
    } else {
      this.body = Buffer.from(data.toString());
    }
    this.isEnded = true;
    this.emit('finish');
    return this;
  }
}

const runTests = async () => {
  console.log('=== STARTING VANGUARD REPORT SYSTEM TESTS ===');

  // Connect to Database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  // Clean old audit logs for reporting
  await AuditLog.collection.deleteMany({ action: 'REPORT_GENERATED' });
  console.log('✔ Cleared historical report generation audit logs');

  // Create a mock user for req
  const mockAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Report Test Admin',
    email: 'admin@vanguardarc.in',
    role: 'Admin',
    isActive: true
  };

  const mockReq = {
    user: mockAdminUser,
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Reports-Test-Agent'
    }
  };

  // Helper to execute and capture controller response
  const executeController = (fn, req) => {
    return new Promise((resolve, reject) => {
      const res = new MockResponse();
      res.on('finish', () => {
        resolve(res);
      });
      res.on('error', (err) => {
        reject(err);
      });
      
      // Execute controller
      fn(req, res, (err) => {
        if (err) reject(err);
      });
    });
  };

  try {
    // ----------------------------------------------------
    // TEST PART 1: ROUTER RBAC CONFIGURATION CHECK
    // ----------------------------------------------------
    console.log('\nVerifying Route RBAC configurations...');
    
    // Check reportRoutes router stack
    const routesConfig = router.stack.map(layer => {
      const path = layer.route?.path;
      const methods = layer.route?.methods;
      // Extract roles from authorizeRoles middleware if accessible
      // We can inspect the middleware stack
      return { path, methods };
    });

    assert.ok(routesConfig.some(r => r.path === '/infrastructure/pdf'));
    assert.ok(routesConfig.some(r => r.path === '/compliance/csv'));
    assert.ok(routesConfig.some(r => r.path === '/incidents/excel'));
    assert.ok(routesConfig.some(r => r.path === '/risk/pdf'));
    assert.ok(routesConfig.some(r => r.path === '/agent/excel'));
    console.log('✔ Express routes registered correctly in reportRoutes');

    // ----------------------------------------------------
    // TEST PART 2: DATA COMPILERS & EXPORTS ON EXISTING DATABASE
    // ----------------------------------------------------
    console.log('\nTesting Exporters with current database records...');

    // A. Infrastructure Exports
    console.log('  Testing Infrastructure Exports...');
    const infraPdfRes = await executeController(getInfrastructurePdf, mockReq);
    assert.strictEqual(infraPdfRes.statusCode, 200);
    assert.strictEqual(infraPdfRes.headers['content-type'], 'application/pdf');
    assert.ok(infraPdfRes.body.length > 0);

    const infraCsvRes = await executeController(getInfrastructureCsv, mockReq);
    assert.strictEqual(infraCsvRes.statusCode, 200);
    assert.strictEqual(infraCsvRes.headers['content-type'], 'text/csv');
    assert.ok(infraCsvRes.body.toString().includes('Node Code'));

    const infraExcelRes = await executeController(getInfrastructureExcel, mockReq);
    assert.strictEqual(infraExcelRes.statusCode, 200);
    assert.strictEqual(infraExcelRes.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(infraExcelRes.body.length > 0);
    console.log('  ✔ Infrastructure exports (PDF, CSV, Excel) generated successfully');

    // B. Compliance Exports
    console.log('  Testing Compliance Exports...');
    const compPdfRes = await executeController(getCompliancePdf, mockReq);
    assert.strictEqual(compPdfRes.statusCode, 200);
    assert.strictEqual(compPdfRes.headers['content-type'], 'application/pdf');
    assert.ok(compPdfRes.body.length > 0);

    const compCsvRes = await executeController(getComplianceCsv, mockReq);
    assert.strictEqual(compCsvRes.statusCode, 200);
    assert.strictEqual(compCsvRes.headers['content-type'], 'text/csv');
    assert.ok(compCsvRes.body.toString().includes('Rule Code') || compCsvRes.body.toString().includes('No records'));

    const compExcelRes = await executeController(getComplianceExcel, mockReq);
    assert.strictEqual(compExcelRes.statusCode, 200);
    assert.strictEqual(compExcelRes.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(compExcelRes.body.length > 0);
    console.log('  ✔ Compliance exports (PDF, CSV, Excel) generated successfully');

    // C. Incident Exports
    console.log('  Testing Incident Exports...');
    const incPdfRes = await executeController(getIncidentsPdf, mockReq);
    assert.strictEqual(incPdfRes.statusCode, 200);
    assert.strictEqual(incPdfRes.headers['content-type'], 'application/pdf');
    assert.ok(incPdfRes.body.length > 0);

    const incCsvRes = await executeController(getIncidentsCsv, mockReq);
    assert.strictEqual(incCsvRes.statusCode, 200);
    assert.strictEqual(incCsvRes.headers['content-type'], 'text/csv');
    assert.ok(incCsvRes.body.toString().includes('Incident ID') || incCsvRes.body.toString().includes('No records'));

    const incExcelRes = await executeController(getIncidentsExcel, mockReq);
    assert.strictEqual(incExcelRes.statusCode, 200);
    assert.strictEqual(incExcelRes.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(incExcelRes.body.length > 0);
    console.log('  ✔ Incident exports (PDF, CSV, Excel) generated successfully');

    // D. Risk Exports
    console.log('  Testing Risk Exports...');
    const riskPdfRes = await executeController(getRiskPdf, mockReq);
    assert.strictEqual(riskPdfRes.statusCode, 200);
    assert.strictEqual(riskPdfRes.headers['content-type'], 'application/pdf');
    assert.ok(riskPdfRes.body.length > 0);

    const riskCsvRes = await executeController(getRiskCsv, mockReq);
    assert.strictEqual(riskCsvRes.statusCode, 200);
    assert.strictEqual(riskCsvRes.headers['content-type'], 'text/csv');
    assert.ok(riskCsvRes.body.toString().includes('Node Code') || riskCsvRes.body.toString().includes('No records'));

    const riskExcelRes = await executeController(getRiskExcel, mockReq);
    assert.strictEqual(riskExcelRes.statusCode, 200);
    assert.strictEqual(riskExcelRes.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(riskExcelRes.body.length > 0);
    console.log('  ✔ Risk exports (PDF, CSV, Excel) generated successfully');

    // E. Agent Actions Exports
    console.log('  Testing Agent Actions Exports...');
    const agentPdfRes = await executeController(getAgentPdf, mockReq);
    assert.strictEqual(agentPdfRes.statusCode, 200);
    assert.strictEqual(agentPdfRes.headers['content-type'], 'application/pdf');
    assert.ok(agentPdfRes.body.length > 0);

    const agentCsvRes = await executeController(getAgentCsv, mockReq);
    assert.strictEqual(agentCsvRes.statusCode, 200);
    assert.strictEqual(agentCsvRes.headers['content-type'], 'text/csv');
    assert.ok(agentCsvRes.body.toString().includes('Threat Detected') || agentCsvRes.body.toString().includes('No records'));

    const agentExcelRes = await executeController(getAgentExcel, mockReq);
    assert.strictEqual(agentExcelRes.statusCode, 200);
    assert.strictEqual(agentExcelRes.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(agentExcelRes.body.length > 0);
    console.log('  ✔ Agent Actions exports (PDF, CSV, Excel) generated successfully');

    // ----------------------------------------------------
    // TEST PART 3: AUDIT SYSTEM INTEGRATION CHECK
    // ----------------------------------------------------
    console.log('\nTesting Audit Logging Integration...');
    
    // Wait for async db writes to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check that we logged exactly 15 REPORT_GENERATED events (5 modules * 3 formats)
    const reportLogs = await AuditLog.find({ action: 'REPORT_GENERATED' });
    assert.strictEqual(reportLogs.length, 15);

    // Verify metadata and user fields
    const sampleLog = reportLogs[0];
    assert.strictEqual(sampleLog.username, 'Report Test Admin');
    assert.strictEqual(sampleLog.role, 'Admin');
    assert.ok(sampleLog.metadata.reportType);
    assert.ok(sampleLog.metadata.format);
    console.log('✔ Audit logging verified successfully');

    // ----------------------------------------------------
    // TEST PART 4: EMPTY DATABASE ROBUSTNESS CHECK
    // ----------------------------------------------------
    console.log('\nTesting Empty Database safety (simulated empty datasets)...');
    
    // We mock reportService methods to return empty array data structures
    const originalGetInfrastructureData = reportService.getInfrastructureData;
    const originalGetComplianceData = reportService.getComplianceData;
    const originalGetIncidentData = reportService.getIncidentData;
    const originalGetRiskData = reportService.getRiskData;
    const originalGetAgentData = reportService.getAgentData;

    // Stub services to simulate empty database states
    reportService.getInfrastructureData = async () => ({
      nodeInventory: [],
      regionalBreakdown: [],
      assetHealth: { healthy: 0, warning: 0, critical: 0, maintenance: 0, total: 0 },
      availability: { nodes: '0.00', connections: '0.00' },
      capacity: { connectionLoads: [], averageLoad: '0.00' },
      sensorsCount: 0
    });

    reportService.getComplianceData = async () => ({
      complianceScore: 100,
      violationsSummary: { total: 0, open: 0, investigating: 0, resolved: 0 },
      severityDistribution: { Low: 0, Medium: 0, High: 0, Critical: 0 },
      standardsBreakdown: { 'API617': { rulesCount: 0, openViolations: 0, totalViolations: 0 } },
      rulesPerformance: [],
      recentViolations: []
    });

    reportService.getIncidentData = async () => ({
      summary: { total: 0, open: 0, closed: 0, critical: 0, resolutionRate: '100.00' },
      severityDistribution: { Low: 0, Medium: 0, High: 0, Critical: 0 },
      meanResolutionTimeHours: '0.00',
      incidentList: []
    });

    reportService.getRiskData = async () => ({
      summary: { totalNodes: 0, distribution: { Low: 0, Medium: 0, High: 0, Critical: 0 } },
      topRiskAssets: [],
      history: [],
      heatmapSummary: []
    });

    reportService.getAgentData = async () => ({
      summary: { totalActions: 0, success: 0, pending: 0, failed: 0, successRate: '100.00', avgConfidence: '0.00' },
      decisionsLog: [],
      mitigationsSummary: { total: 0, completed: 0, pending: 0, failed: 0, inProgress: 0 },
      mitigationsLog: []
    });

    // Run PDF Exporters on empty states and check for crashes
    const emptyInfraPdf = await executeController(getInfrastructurePdf, mockReq);
    assert.strictEqual(emptyInfraPdf.statusCode, 200);

    const emptyCompPdf = await executeController(getCompliancePdf, mockReq);
    assert.strictEqual(emptyCompPdf.statusCode, 200);

    const emptyIncPdf = await executeController(getIncidentsPdf, mockReq);
    assert.strictEqual(emptyIncPdf.statusCode, 200);

    const emptyRiskPdf = await executeController(getRiskPdf, mockReq);
    assert.strictEqual(emptyRiskPdf.statusCode, 200);

    const emptyAgentPdf = await executeController(getAgentPdf, mockReq);
    assert.strictEqual(emptyAgentPdf.statusCode, 200);

    console.log('✔ Exporters successfully handled empty states without crashing');

    // Restore original service stubs
    reportService.getInfrastructureData = originalGetInfrastructureData;
    reportService.getComplianceData = originalGetComplianceData;
    reportService.getIncidentData = originalGetIncidentData;
    reportService.getRiskData = originalGetRiskData;
    reportService.getAgentData = originalGetAgentData;

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n=== ALL REPORT SYSTEM TESTS PASSED SUCCESSFULLY ===');
    process.exit(0);
  }
};

runTests();
