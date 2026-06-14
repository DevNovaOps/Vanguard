import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

process.env.VANGUARD_TEST = 'true';
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
import AgentAction from '../src/models/AgentAction.js';
import Notification from '../src/models/Notification.js';

// Import Services & Sockets
import { initSocket } from '../src/config/socket.js';
import notificationService from '../src/services/notificationService.js';
import complianceService from '../src/services/complianceService.js';
import riskService from '../src/services/riskService.js';
import incidentService from '../src/services/incidentService.js';
import aiAgentService from '../src/services/aiAgentService.js';
import mitigationService from '../src/services/mitigationService.js';
import simulationEngine from '../src/services/simulationEngine.js';

const runTests = async () => {
  console.log('=== STARTING NOTIFICATION ENGINE INTEGRATION TESTS ===');

  // Initialize dummy HTTP server for Socket.io
  const dummyServer = http.createServer();
  initSocket(dummyServer);
  console.log('✔ Mock Socket.IO initialized');

  // Connect to Database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  // Clean old notifications and mock documents
  await Notification.deleteMany({});
  await ComplianceViolation.deleteMany({});
  await Incident.deleteMany({});
  await Mitigation.deleteMany({});
  await AgentAction.deleteMany({});
  console.log('✔ Cleared historical notifications and mock documents for clean state testing');

  let testNode = null;
  let testRule = null;
  
  // Setup users for various roles to test RBAC rules
  let adminUser = null;
  let safetyOfficer = null;
  let operatorUser = null;
  let managerUser = null;

  try {
    // 1. Setup Test Node
    testNode = await RailwayNode.findOne({ nodeCode: 'TNOT' });
    if (!testNode) {
      testNode = await RailwayNode.create({
        nodeCode: 'TNOT',
        nodeName: 'Test Notification Station',
        nodeType: 'Station',
        latitude: 26.0,
        longitude: 71.0,
        status: 'healthy',
        region: 'Test Region'
      });
    }

    // 2. Setup Test Rule
    testRule = await ComplianceRule.findOne({ ruleCode: 'NOT-RULE-1' });
    if (!testRule) {
      testRule = await ComplianceRule.create({
        ruleCode: 'NOT-RULE-1',
        name: 'Test Compliance Notification Rule',
        sensorType: 'Temperature',
        minValue: 10,
        maxValue: 120,
        severity: 'Critical',
        standard: 'Compliance Standard',
        description: 'Verifies the notification system compliance trigger functionality'
      });
    }

    // 3. Setup Test Users
    adminUser = await User.findOne({ email: 'admin_test_notif@vanguard.in' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Notif Test',
        email: 'admin_test_notif@vanguard.in',
        password: 'Password123!',
        role: 'Admin',
        department: 'Management',
        isActive: true
      });
    }

    safetyOfficer = await User.findOne({ email: 'safety_test_notif@vanguard.in' });
    if (!safetyOfficer) {
      safetyOfficer = await User.create({
        name: 'Safety Notif Test',
        email: 'safety_test_notif@vanguard.in',
        password: 'Password123!',
        role: 'SafetyOfficer',
        department: 'Safety',
        isActive: true
      });
    }

    operatorUser = await User.findOne({ email: 'operator_test_notif@vanguard.in' });
    if (!operatorUser) {
      operatorUser = await User.create({
        name: 'Operator Notif Test',
        email: 'operator_test_notif@vanguard.in',
        password: 'Password123!',
        role: 'Operator',
        department: 'Operations',
        isActive: true
      });
    }

    managerUser = await User.findOne({ email: 'manager_test_notif@vanguard.in' });
    if (!managerUser) {
      managerUser = await User.create({
        name: 'Manager Notif Test',
        email: 'manager_test_notif@vanguard.in',
        password: 'Password123!',
        role: 'Manager',
        department: 'Management',
        isActive: true
      });
    }

    // ============================================
    // TEST TRiggers & Automatic creation
    // ============================================

    // Test A: Compliance Trigger
    console.log('\nTesting Compliance Engine Notification Trigger...');
    const violations = await complianceService.evaluateReading({
      nodeId: testNode._id,
      sensorType: 'Temperature',
      value: 140 // exceeds max threshold
    });
    assert.ok(violations.length > 0);
    const complianceNotifs = await Notification.find({ type: 'ComplianceViolation' });
    assert.ok(complianceNotifs.length >= 1);
    assert.ok(complianceNotifs[0].title.includes('Compliance Violation'));
    console.log('✔ Compliance Engine triggered a compliance violation notification');

    // Test B: Risk Trigger
    console.log('\nTesting Risk Engine Notification Trigger...');
    await riskService.evaluateNodeRisk({
      nodeId: testNode._id,
      riskScore: 75, // High risk
      reason: 'Abnormal thermal activity',
      req: null
    });
    const riskNotifs = await Notification.find({ type: 'RiskAlert' });
    assert.ok(riskNotifs.length >= 1);
    assert.ok(riskNotifs.some(n => n.severity === 'High'));
    console.log('✔ Risk Engine triggered a risk alert notification');

    // Test C: Incident Triggers (Created/Escalated)
    console.log('\nTesting Incident Engine Notification Triggers...');
    let incident = await Incident.findOne({ nodeId: testNode._id, status: 'Open' });
    assert.ok(incident);
    const incidentCreatedNotifs = await Notification.find({ type: 'IncidentCreated' });
    assert.strictEqual(incidentCreatedNotifs.length, 1);

    // Escalate the incident
    await incidentService.updateIncident(incident.incidentId, { riskScore: 95 }, null);
    const incidentEscalatedNotifs = await Notification.find({ type: 'IncidentEscalated' });
    assert.strictEqual(incidentEscalatedNotifs.length, 1);
    console.log('✔ Incident Engine triggered incident creation and escalation notifications');

    // Test D: AI Agent Trigger
    console.log('\nTesting AI Agent Notification Trigger...');
    await aiAgentService.evaluateTelemetry({
      temperature: 110,
      vibration: 35,
      gas: 5,
      power: 24,
      riskScore: 75,
      nodeId: testNode._id
    }, null);
    const agentNotifs = await Notification.find({ type: 'AgentDecision' });
    assert.ok(agentNotifs.length >= 1);
    console.log('✔ AI Agent triggered a decision notification');

    // Test E: Mitigation Trigger (Created / Executed / Failed)
    console.log('\nTesting Mitigation Center Notification Triggers...');
    let mitigation = await Mitigation.findOne({ nodeId: testNode._id });
    assert.ok(mitigation);
    const mitigationCreatedNotifs = await Notification.find({ type: 'MitigationCreated' });
    assert.ok(mitigationCreatedNotifs.length >= 1);

    await mitigationService.executeMitigation(mitigation.mitigationId, { executionNotes: 'Shutdown protocol active' }, null);
    const mitigationExecutedNotifs = await Notification.find({ type: 'MitigationExecuted' });
    assert.ok(mitigationExecutedNotifs.length >= 1);

    await mitigationService.updateMitigationStatus(mitigation.mitigationId, { status: 'Failed', executionNotes: 'Secondary circuit breaker tripped' }, null);
    const mitigationFailedNotifs = await Notification.find({ type: 'MitigationFailed' });
    assert.ok(mitigationFailedNotifs.length >= 1);
    console.log('✔ Mitigation Center triggered creation, execution, and failure notifications');

    // Test F: Simulation Cascade Triggers
    console.log('\nTesting Simulation Cascade Notification Triggers...');
    const run = await simulationEngine.triggerSimulation({ user: adminUser });

    const startNotif = await Notification.findOne({ type: 'SimulationStarted', 'metadata.runCode': run.runId });
    assert.ok(startNotif, `SimulationStarted notification not found for run ${run.runId}`);

    const completeNotif = await Notification.findOne({ type: 'SimulationCompleted', 'metadata.runCode': run.runId });
    assert.ok(completeNotif, `SimulationCompleted notification not found for run ${run.runId}`);
    console.log('✔ Simulation Engine triggered start and completion notifications');

    // ============================================
    // TEST SERVICE RBAC & LOGIC
    // ============================================

    console.log('\nTesting Service RBAC Visibility Rules...');
    
    // SafetyOfficer sees: Compliance, Risk, Incident, AutonomousAgent, Mitigation
    const safetyRes = await notificationService.getNotifications(safetyOfficer);
    assert.ok(safetyRes.notifications.length > 0);
    const hasUnwantedForSafety = safetyRes.notifications.some(n => ['SimulationStarted', 'SimulationCompleted'].includes(n.type));
    assert.strictEqual(hasUnwantedForSafety, false, 'Safety officer should not see simulation notifications');
    console.log('✔ Safety Officer visibility restriction verified');

    // Operator sees: Incident, Mitigation, Simulation, Sensor, SensorData, TransitNode
    const operatorRes = await notificationService.getNotifications(operatorUser);
    assert.ok(operatorRes.notifications.length > 0);
    const hasUnwantedForOperator = operatorRes.notifications.some(n => ['ComplianceViolation', 'RiskAlert', 'AgentDecision'].includes(n.type));
    assert.strictEqual(hasUnwantedForOperator, false, 'Operator should not see compliance, risk, or agent decisions');
    console.log('✔ Operator visibility restriction verified');

    // Manager sees only High/Critical notifications
    const managerRes = await notificationService.getNotifications(managerUser);
    const hasUnwantedForManager = managerRes.notifications.some(n => ['Info', 'Warning'].includes(n.severity));
    assert.strictEqual(hasUnwantedForManager, false, 'Manager should only see High or Critical severity notifications');
    console.log('✔ Manager severity restriction verified');

    // Admin sees everything
    const adminRes = await notificationService.getNotifications(adminUser);
    const totalNotifs = await Notification.countDocuments({});
    assert.strictEqual(adminRes.notifications.length, totalNotifs, 'Admin should retrieve all notifications');
    console.log('✔ Admin unrestricted access verified');

    // ============================================
    // TEST READ STATUSES & STATE CHANGE
    // ============================================

    console.log('\nTesting Unread Tracking and Mark-As-Read Logic...');

    // Initially, notifications are unread by everyone (readBy array is empty)
    const initialSafetyUnread = await notificationService.getUnreadNotifications(safetyOfficer);
    const initialOperatorUnread = await notificationService.getUnreadNotifications(operatorUser);
    assert.ok(initialSafetyUnread.length > 0);
    assert.ok(initialOperatorUnread.length > 0);

    // Mark single as read for Safety Officer (choose an Incident or Mitigation notification visible to both Safety Officer and Operator)
    const sampleNotif = initialSafetyUnread.find(n => ['Incident', 'Mitigation'].includes(n.module));
    assert.ok(sampleNotif, 'Should find an incident/mitigation notification visible to both roles');
    const readResult = await notificationService.markAsRead(sampleNotif.notificationId, safetyOfficer, null);
    assert.strictEqual(readResult.isRead, true);

    // Check that it's marked as read for Safety Officer but still UNREAD for Operator (multi-user isolation)
    const finalSafetyUnread = await notificationService.getUnreadNotifications(safetyOfficer);
    const safetyStillUnread = finalSafetyUnread.find(n => n.notificationId === sampleNotif.notificationId);
    assert.ok(!safetyStillUnread, 'The notification should be read for the safety officer');

    const checkOperatorUnread = await notificationService.getUnreadNotifications(operatorUser);
    const operatorStillUnread = checkOperatorUnread.find(n => n.notificationId === sampleNotif.notificationId);
    assert.ok(operatorStillUnread, 'The notification should still be unread for the operator');
    console.log('✔ Isolated read tracking (multi-user readBy state) verified successfully');

    // Mark all as read for Operator
    const markedCount = await notificationService.markAllAsRead(operatorUser, null);
    assert.ok(markedCount > 0);
    const operatorUnreadCountAfter = await notificationService.getUnreadNotifications(operatorUser);
    assert.strictEqual(operatorUnreadCountAfter.length, 0);
    console.log('✔ Mark all notifications as read verified successfully');

    // ============================================
    // TEST STATS & DELETION
    // ============================================

    console.log('\nTesting Stats Aggregation...');
    const stats = await notificationService.getNotificationStats(safetyOfficer);
    assert.ok(stats.totalNotifications > 0);
    assert.ok(stats.unreadNotifications >= 0);
    assert.ok(stats.criticalNotifications >= 0);
    console.log('✔ Stats compilation verified successfully');

    console.log('\nTesting Deletion Restrictions...');
    // Non-admins cannot delete
    try {
      await notificationService.deleteNotification(sampleNotif.notificationId, safetyOfficer, null);
      assert.fail('Safety officer should not be authorized to delete notifications');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }

    // Admin can delete
    const deleteRes = await notificationService.deleteNotification(sampleNotif.notificationId, adminUser, null);
    assert.strictEqual(deleteRes.notificationId, sampleNotif.notificationId);
    console.log('✔ Deletion restriction and deletion operation verified successfully');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log('\nCleaning up test database entities...');
    await Notification.deleteMany({});
    await ComplianceViolation.deleteMany({});
    
    if (testNode) {
      await Incident.deleteMany({ nodeId: testNode._id });
      await Mitigation.deleteMany({ nodeId: testNode._id });
      await AgentAction.deleteMany({ nodeId: testNode._id });
      await RailwayNode.deleteOne({ _id: testNode._id });
    }
    if (testRule) {
      await ComplianceRule.deleteOne({ _id: testRule._id });
    }
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (safetyOfficer) await User.deleteOne({ _id: safetyOfficer._id });
    if (operatorUser) await User.deleteOne({ _id: operatorUser._id });
    if (managerUser) await User.deleteOne({ _id: managerUser._id });

    await mongoose.connection.close();
    console.log('=== ALL NOTIFICATION INTEGRATION TESTS PASSED SUCCESSFULLY ===');
    process.exit(0);
  }
};

runTests();
