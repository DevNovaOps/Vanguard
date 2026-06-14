process.env.VANGUARD_TEST = 'true';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import assert from 'assert';
import http from 'http';
import dns from 'dns';

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

// Import Services & Sockets
import { initSocket } from '../src/config/socket.js';
import auditService from '../src/services/auditService.js';
import complianceService from '../src/services/complianceService.js';
import riskService from '../src/services/riskService.js';
import incidentService from '../src/services/incidentService.js';
import aiAgentService from '../src/services/aiAgentService.js';
import mitigationService from '../src/services/mitigationService.js';
import simulationEngine from '../src/services/simulationEngine.js';

const runTests = async () => {
  console.log('=== STARTING MODULE 13 AUDIT SYSTEM TESTS ===');

  // Initialize dummy HTTP server for Socket.io
  const dummyServer = http.createServer();
  initSocket(dummyServer);
  console.log('✔ Socket.IO initialized mock interface');

  // Connect to Database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  // Clean old audit logs and setup test entities
  await AuditLog.collection.deleteMany({});
  await ComplianceViolation.deleteMany({});
  await Incident.deleteMany({});
  await Mitigation.deleteMany({});
  await AgentAction.deleteMany({});
  console.log('✔ Cleared historical audit logs and mock documents for clean state testing');

  let testNode = null;
  let testUser = null;
  let testRule = null;

  try {
    // 1. Setup Test Node
    testNode = await RailwayNode.findOne({ nodeCode: 'TAUD' });
    if (!testNode) {
      testNode = await RailwayNode.create({
        nodeCode: 'TAUD',
        nodeName: 'Test Audit Station',
        nodeType: 'Station',
        latitude: 25.0,
        longitude: 70.0,
        status: 'healthy',
        region: 'Test Region'
      });
    }

    // 2. Setup Test User
    testUser = await User.findOne({ email: 'test_audit_user@vanguardarc.in' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Audit Officer',
        email: 'test_audit_user@vanguardarc.in',
        password: 'Password123!',
        role: 'SafetyOfficer',
        department: 'Operations',
        isActive: true
      });
    }

    // 3. Setup Test Compliance Rule
    testRule = await ComplianceRule.findOne({ ruleCode: 'AUD-RULE-1' });
    if (!testRule) {
      testRule = await ComplianceRule.create({
        ruleCode: 'AUD-RULE-1',
        name: 'Test Audit Rule',
        sensorType: 'Temperature',
        minValue: 10,
        maxValue: 120,
        severity: 'Critical',
        standard: 'Audit Standard',
        description: 'Verifies the audit system functionality'
      });
    }

    // ============================================
    // TEST FLOWS
    // ============================================

    // Test A: Authentication logging
    console.log('\nTesting Authentication Audits...');
    await auditService.logLogin(null, testUser, true);
    await auditService.logLogin(null, { email: 'wrong_login@vanguard.in' }, false, 'Invalid credentials');
    await auditService.logLogout(null, testUser);

    const authLogs = await AuditLog.find({ module: 'Authentication' });
    assert.strictEqual(authLogs.length, 3);
    assert.ok(authLogs.some(l => l.action === 'LOGIN_SUCCESS'));
    assert.ok(authLogs.some(l => l.action === 'LOGIN_FAILED'));
    assert.ok(authLogs.some(l => l.action === 'USER_LOGOUT'));
    console.log('✔ Authentication logging verified successfully');

    // Test B: Compliance logging
    console.log('\nTesting Compliance Audits...');
    // Create Rule audit (already done inside createRule normally, but let's test rule logging)
    await auditService.logEvent({
      userId: testUser._id,
      username: testUser.name,
      role: testUser.role,
      action: 'Rule Created',
      module: 'Compliance',
      description: `Created new compliance rule: ${testRule.ruleCode}`,
      severity: 'Info',
      metadata: { ruleCode: testRule.ruleCode }
    });

    // Evaluate reading triggers violation and validation logs
    // 1. Violation Trigger (> 120 threshold)
    await complianceService.evaluateReading({
      nodeId: testNode._id,
      sensorType: 'Temperature',
      value: 135
    });

    // 2. Validation Trigger (within limits)
    await complianceService.evaluateReading({
      nodeId: testNode._id,
      sensorType: 'Temperature',
      value: 50
    });

    const complianceLogs = await AuditLog.find({ module: 'Compliance' });
    assert.ok(complianceLogs.length >= 3);
    assert.ok(complianceLogs.some(l => l.action === 'Rule Created'));
    assert.ok(complianceLogs.some(l => l.action === 'Compliance Violation'));
    assert.ok(complianceLogs.some(l => l.action === 'Compliance Validation'));
    console.log('✔ Compliance violation and validation logging verified successfully');

    // Test C: Risk logging
    console.log('\nTesting Risk Audits...');
    await riskService.evaluateNodeRisk({
      nodeId: testNode._id,
      riskScore: 89, // Critical risk
      reason: 'Sustained temperature spike',
      req: { user: testUser }
    });

    const riskLogs = await AuditLog.find({ module: 'Risk' });
    assert.ok(riskLogs.length >= 2);
    assert.ok(riskLogs.some(l => l.action === 'Risk Recalculation'));
    assert.ok(riskLogs.some(l => l.action === 'Risk Threshold Breached'));
    console.log('✔ Risk calculation and threshold breach logging verified successfully');

    // Test D: Incident logging
    console.log('\nTesting Incident Audits...');
    let incident = await Incident.findOne({ nodeId: testNode._id, status: 'Open' });
    assert.ok(incident);

    // Update Incident
    await incidentService.assignTeam(incident.incidentId, 'Delta Team', { user: testUser });
    await incidentService.resolveIncident(incident.incidentId, { user: testUser });
    await incidentService.closeIncident(incident.incidentId, { user: testUser });

    const incidentLogs = await AuditLog.find({ module: 'Incident' });
    assert.ok(incidentLogs.some(l => l.action === 'Incident Created'));
    assert.ok(incidentLogs.some(l => l.action === 'Incident Assigned'));
    assert.ok(incidentLogs.some(l => l.action === 'Incident Resolved'));
    assert.ok(incidentLogs.some(l => l.action === 'Incident Closed'));
    console.log('✔ Incident lifecycle logging verified successfully');

    // Test E: Autonomous Agent logging
    console.log('\nTesting Autonomous Agent Audits...');
    const actionRecord = await aiAgentService.evaluateTelemetry({
      temperature: 95, // Exceeds 90 limit
      vibration: 20,
      gas: 5,
      power: 24,
      riskScore: 50,
      nodeId: testNode._id
    }, { user: testUser });

    const agentLogs = await AuditLog.find({ module: 'AutonomousAgent' });
    assert.ok(agentLogs.length >= 4);
    assert.ok(agentLogs.some(l => l.action === 'Threat Detected'));
    assert.ok(agentLogs.some(l => l.action === 'Severity Classified'));
    assert.ok(agentLogs.some(l => l.action === 'Plan Generated'));
    assert.ok(agentLogs.some(l => l.action === 'Action Executed'));
    console.log('✔ Autonomous agent decision steps verified successfully');

    // Test F: Mitigation logging
    console.log('\nTesting Mitigation Audits...');
    const mitigation = await Mitigation.findOne({ nodeId: testNode._id });
    assert.ok(mitigation);

    // Execute and Fail mitigation
    await mitigationService.executeMitigation(mitigation.mitigationId, { executionNotes: 'Attempted restart' }, { user: testUser });
    await mitigationService.updateMitigationStatus(mitigation.mitigationId, { status: 'Failed', executionNotes: 'Failed response' }, { user: testUser });

    const mitigationLogs = await AuditLog.find({ module: 'Mitigation' });
    assert.ok(mitigationLogs.some(l => l.action === 'Mitigation Created'));
    assert.ok(mitigationLogs.some(l => l.action === 'Mitigation Executed'));
    assert.ok(mitigationLogs.some(l => l.action === 'Mitigation Failed'));
    console.log('✔ Mitigation center state transitions verified successfully');

    // Test G: Simulation logging
    console.log('\nTesting Failure Simulation Audits...');
    await AuditLog.collection.deleteMany({ module: 'Simulation' });
    await simulationEngine.triggerSimulation({ user: testUser });

    const simLogs = await AuditLog.find({ module: 'Simulation' }).sort({ timestamp: 1 });
    assert.ok(simLogs.length >= 7);
    assert.ok(simLogs.some(l => l.action === 'Simulation Started'));
    assert.ok(simLogs.some(l => l.action === 'Failure Scenario Generated'));
    assert.ok(simLogs.some(l => l.action === 'Risk Score Calculated'));
    assert.ok(simLogs.some(l => l.action === 'System Stabilized'));
    assert.ok(simLogs.some(l => l.action === 'Simulation Completed'));
    console.log('✔ Simulation sequential stages verified successfully');

    // Test H: Immutability check
    console.log('\nTesting Immutability Guard...');
    const sampleLog = await AuditLog.findOne({});
    assert.ok(sampleLog);

    try {
      sampleLog.description = 'Hacked Description';
      await sampleLog.save();
      assert.fail('Should not allow audit log modification');
    } catch (err) {
      assert.ok(err.message.includes('immutable'));
      console.log('✔ Immutability Pre-Save checks blocks modifications successfully');
    }

    try {
      await AuditLog.deleteOne({ _id: sampleLog._id });
      assert.fail('Should not allow audit log deletion');
    } catch (err) {
      assert.ok(err.message.includes('immutable'));
      console.log('✔ Immutability Pre-Delete checks blocks deletions successfully');
    }

    // Test I: Dashboard Statistics
    console.log('\nTesting Statistics & Aggregations...');
    const stats = await auditService.getAuditStatistics();
    assert.ok(stats.totalLogs > 0);
    assert.ok(stats.infoEvents >= 0);
    assert.ok(stats.warningEvents >= 0);
    assert.ok(stats.criticalEvents >= 0);
    assert.strictEqual(stats.simulationsTriggered, 1);
    console.log('✔ Dashboard statistics aggregation verified successfully');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log('\nCleaning up database entities...');
    if (testNode) {
      await Incident.deleteMany({ nodeId: testNode._id });
      await Mitigation.deleteMany({ nodeId: testNode._id });
      await ComplianceViolation.deleteMany({ nodeId: testNode._id });
      await AgentAction.deleteMany({ nodeId: testNode._id });
      await RailwayNode.deleteOne({ _id: testNode._id });
    }
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    if (testRule) {
      await ComplianceRule.deleteOne({ _id: testRule._id });
    }

    await mongoose.connection.close();
    console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
    process.exit(0);
  }
};

runTests();
