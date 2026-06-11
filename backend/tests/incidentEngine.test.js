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
import incidentService, { calculateSeverity } from '../src/services/incidentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environmental variables relative to tests directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runTests = async () => {
  console.log('=== STARTING INCIDENT ENGINE TESTS ===');
  
  // Connect to DB
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  let testNode = null;
  
  try {
    // 1. Setup Test Node
    testNode = await RailwayNode.findOne({ nodeCode: 'TEST' });
    if (!testNode) {
      testNode = await RailwayNode.create({
        nodeCode: 'TEST',
        nodeName: 'Test Station',
        nodeType: 'Station',
        latitude: 20.0,
        longitude: 75.0,
        status: 'healthy',
        region: 'Test Region'
      });
    }
    console.log(`✔ Node prepared: ${testNode.nodeName} (${testNode._id})`);

    // Clear old test incidents
    await Incident.deleteMany({ nodeId: testNode._id });

    // 2. Test Severity Calculation Logic
    console.log('Testing Severity Calculations...');
    assert.strictEqual(calculateSeverity(10), 'Low');
    assert.strictEqual(calculateSeverity(30), 'Low');
    assert.strictEqual(calculateSeverity(45), 'Medium');
    assert.strictEqual(calculateSeverity(60), 'Medium');
    assert.strictEqual(calculateSeverity(72), 'High');
    assert.strictEqual(calculateSeverity(80), 'High');
    assert.strictEqual(calculateSeverity(95), 'Critical');
    console.log('✔ Severity calculations verified');

    // 3. Test Incident Creation
    console.log('Testing Incident Creation...');
    const incidentData = {
      nodeId: testNode._id,
      riskScore: 85,
      title: 'Vibration Threshold Breach',
      description: 'High vibrations detected at the test junction track switch.',
      source: 'Telemetry',
      assignedTeam: 'Beta'
    };

    const incident = await incidentService.createIncident(incidentData);
    assert.ok(incident);
    assert.ok(incident.incidentId);
    assert.strictEqual(incident.severity, 'Critical'); // 85 -> Critical
    assert.strictEqual(incident.status, 'Open');
    assert.strictEqual(incident.assignedTeam, 'Beta');
    console.log(`✔ Incident created successfully: ${incident.incidentId}`);

    // 4. Test Duplicate Prevention (Update existing Open incident)
    console.log('Testing Duplicate Prevention...');
    const duplicateData = {
      nodeId: testNode._id,
      riskScore: 55, // Medium risk
      description: 'New temperature warnings detected.',
      source: 'Telemetry'
    };

    const updatedIncident = await incidentService.createIncident(duplicateData);
    assert.strictEqual(updatedIncident.incidentId, incident.incidentId); // Should be the same incident ID
    assert.strictEqual(updatedIncident.riskScore, 55);
    assert.strictEqual(updatedIncident.severity, 'Medium'); // Auto updated to Medium
    assert.strictEqual(updatedIncident.description, 'New temperature warnings detected.');
    console.log(`✔ Duplicate check verified. Incident updated rather than recreated.`);

    // 5. Test State transitions: Assign Team, Resolve, Close
    console.log('Testing Incident Assignment...');
    const assigned = await incidentService.assignTeam(incident.incidentId, 'Gamma');
    assert.strictEqual(assigned.assignedTeam, 'Gamma');
    console.log('✔ Assignment verified');

    console.log('Testing Incident Resolution...');
    const resolved = await incidentService.resolveIncident(incident.incidentId);
    assert.strictEqual(resolved.status, 'Resolved');
    console.log('✔ Resolution verified');

    console.log('Testing Incident Closure...');
    const closed = await incidentService.closeIncident(incident.incidentId);
    assert.strictEqual(closed.status, 'Closed');
    console.log('✔ Closure verified');

    // 6. Test Query Methods
    console.log('Testing Incident Querying...');
    const all = await incidentService.getAllIncidents();
    assert.ok(all.length > 0);

    const openList = await incidentService.getOpenIncidents();
    // Since our test incident was closed, it shouldn't show up in the open list
    const foundClosedInOpen = openList.some(i => i.incidentId === incident.incidentId);
    assert.strictEqual(foundClosedInOpen, false);
    console.log('✔ Query operations verified');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up
    if (testNode) {
      await Incident.deleteMany({ nodeId: testNode._id });
      await RailwayNode.deleteOne({ _id: testNode._id });
    }
    await mongoose.connection.close();
    console.log('=== TESTS COMPLETED SUCCESSFULLY ===');
    process.exit(0);
  }
};

runTests();
