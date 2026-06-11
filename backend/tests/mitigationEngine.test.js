import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import assert from 'assert';
import dns from 'dns';

// Setup DNS servers to Google DNS for reliable SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4']);

import RailwayNode from '../src/models/RailwayNode.js';
import Incident from '../src/models/Incident.js';
import Mitigation from '../src/models/Mitigation.js';
import User from '../src/models/User.js';
import mitigationService from '../src/services/mitigationService.js';
import aiAgentService from '../src/services/aiAgentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables relative to tests directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runTests = async () => {
  console.log('=== STARTING MITIGATION ENGINE TESTS ===');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  let testNode = null;
  let testIncident = null;
  let testUser = null;

  try {
    // 1. Setup Test Node
    testNode = await RailwayNode.findOne({ nodeCode: 'MIT-TEST' });
    if (!testNode) {
      testNode = await RailwayNode.create({
        nodeCode: 'MIT-TEST',
        nodeName: 'Mitigation Test Station',
        nodeType: 'Station',
        latitude: 21.0,
        longitude: 76.0,
        status: 'healthy',
        region: 'Test Region'
      });
    }
    console.log(`✔ Node prepared: ${testNode.nodeName} (${testNode._id})`);

    // 2. Setup Test Incident
    testIncident = await Incident.create({
      nodeId: testNode._id,
      riskScore: 75,
      severity: 'High',
      title: 'Initial Incident',
      description: 'Mock incident for mitigation testing.',
      status: 'Open',
      source: 'Telemetry'
    });
    console.log(`✔ Incident prepared: ${testIncident.incidentId} (${testIncident._id})`);

    // 3. Setup Test User
    testUser = await User.findOne({ email: 'mitigation_test@vanguard.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Mitigation Tester',
        email: 'mitigation_test@vanguard.com',
        password: 'password123',
        role: 'Operator',
        department: 'Test Operations',
        isActive: true
      });
    }
    console.log(`✔ User prepared: ${testUser.name} (${testUser._id})`);

    // Clear old mitigations on this node/incident
    await Mitigation.deleteMany({ nodeId: testNode._id });

    // 4. Test Mitigation Creation
    console.log('Testing Mitigation Creation...');
    const mitigationData = {
      incidentId: testIncident._id,
      nodeId: testNode._id,
      action: 'Emergency Speed Restriction',
      severity: 'High',
      executionNotes: 'Apply 30 km/h speed limit'
    };

    const mitigation = await mitigationService.createMitigation(mitigationData, { user: testUser });
    assert.ok(mitigation);
    assert.ok(mitigation.mitigationId);
    assert.strictEqual(mitigation.action, 'Emergency Speed Restriction');
    assert.strictEqual(mitigation.type, 'Emergency Speed Restriction');
    assert.strictEqual(mitigation.status, 'Pending');
    console.log(`✔ Mitigation created successfully: ${mitigation.mitigationId}`);

    // Verify Incident status auto-transitioned to 'Mitigating'
    const updatedIncident = await Incident.findById(testIncident._id);
    assert.strictEqual(updatedIncident.status, 'Mitigating');
    console.log('✔ Incident auto-transitioned to Mitigating');

    // 5. Test Status Transitions
    console.log('Testing Status Transitions...');
    const inProgressMit = await mitigationService.updateMitigationStatus(
      mitigation.mitigationId,
      { status: 'InProgress', executionNotes: 'Starting application...' },
      { user: testUser }
    );
    assert.strictEqual(inProgressMit.status, 'InProgress');
    assert.ok(inProgressMit.startedAt);
    console.log('✔ Transitioned to InProgress successfully');

    // 6. Test Execution
    console.log('Testing Execution...');
    const executedMit = await mitigationService.executeMitigation(
      mitigation.mitigationId,
      { executionNotes: 'Speed restrictions successfully applied.' },
      { user: testUser }
    );
    assert.strictEqual(executedMit.status, 'Executed');
    assert.ok(executedMit.executedAt);
    assert.strictEqual(executedMit.executedBy._id.toString(), testUser._id.toString());
    console.log('✔ Execution verified successfully');

    // 7. Test Dashboard Stats
    console.log('Testing Dashboard Stats...');
    const stats = await mitigationService.getDashboardStats();
    assert.ok(stats.totalMitigations >= 1);
    assert.ok(stats.completedActions >= 1); // Executed counts as completed in stats
    assert.ok(stats.latestMitigation);
    console.log('✔ Dashboard stats verification passed');

    // 8. Test AI Agent Evaluation Auto-Trigger
    console.log('Testing AI Agent Auto-Trigger...');
    // Clear mitigations again to isolate stats
    await Mitigation.deleteMany({ nodeId: testNode._id });
    
    // Evaluate telemetry that should trigger 'Shutdown System' (temperature > 90)
    const telemetry = {
      nodeId: testNode._id,
      temperature: 110,
      vibration: 10,
      gas: 5,
      power: 24,
      riskScore: 78
    };

    const action = await aiAgentService.evaluateTelemetry(telemetry, { user: testUser });
    assert.strictEqual(action.decision, 'Shutdown System');

    // Check if mitigation was automatically created
    const autoMitigations = await Mitigation.find({ nodeId: testNode._id, agentActionId: action._id });
    assert.strictEqual(autoMitigations.length, 1);
    assert.strictEqual(autoMitigations[0].action, 'Infrastructure Shutdown');
    assert.strictEqual(autoMitigations[0].executionSource, 'AI_AGENT');
    assert.strictEqual(autoMitigations[0].status, 'Pending');
    console.log('✔ AI Agent evaluation automatically created a Pending Mitigation');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (testNode) {
      await Mitigation.deleteMany({ nodeId: testNode._id });
      await Incident.deleteMany({ nodeId: testNode._id });
      await RailwayNode.deleteOne({ _id: testNode._id });
    }
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }
    await mongoose.connection.close();
    console.log('=== TESTS COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  }
};

runTests();
