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
import User from '../src/models/User.js';
import { MaxHeap } from '../src/services/maxHeap.js';
import incidentPriorityService from '../src/services/incidentPriorityService.js';
import incidentService from '../src/services/incidentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables relative to tests directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runTests = async () => {
  console.log('=== STARTING PRIORITY ENGINE TESTS ===');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');

  let testNode1 = null;
  let testNode2 = null;
  let testUser = null;

  try {
    // 1. Setup Test Nodes
    testNode1 = await RailwayNode.findOne({ nodeCode: 'PRIO-TEST-1' });
    if (!testNode1) {
      testNode1 = await RailwayNode.create({
        nodeCode: 'PRIO-TEST-1',
        nodeName: 'Priority Test Station 1',
        nodeType: 'Station',
        latitude: 22.0,
        longitude: 77.0,
        status: 'healthy',
        region: 'Test Region'
      });
    }
    
    testNode2 = await RailwayNode.findOne({ nodeCode: 'PRIO-TEST-2' });
    if (!testNode2) {
      testNode2 = await RailwayNode.create({
        nodeCode: 'PRIO-TEST-2',
        nodeName: 'Priority Test Station 2',
        nodeType: 'Station',
        latitude: 22.1,
        longitude: 77.1,
        status: 'healthy',
        region: 'Test Region'
      });
    }
    console.log(`✔ Nodes prepared: ${testNode1.nodeName}, ${testNode2.nodeName}`);

    // 2. Setup Test User
    testUser = await User.findOne({ email: 'prio_tester@vanguard.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Priority Tester',
        email: 'prio_tester@vanguard.com',
        password: 'password123',
        role: 'Admin',
        department: 'Test Quality Assurance',
        isActive: true
      });
    }
    console.log(`✔ User prepared: ${testUser.name} (${testUser._id})`);

    // Clean up any old test incidents
    await Incident.deleteMany({ nodeId: { $in: [testNode1._id, testNode2._id] } });

    // 3. Test Max Heap Data Structure Helpers directly
    console.log('Testing Max Heap class functions...');
    const heap = new MaxHeap();
    
    const itemLow = { riskScore: 30, severity: 'Low', incidentId: 'LOW' };
    const itemMedium = { riskScore: 50, severity: 'Medium', incidentId: 'MEDIUM' };
    const itemHigh = { riskScore: 75, severity: 'High', incidentId: 'HIGH' };
    const itemCritical = { riskScore: 90, severity: 'Critical', incidentId: 'CRITICAL' };

    heap.insert(itemLow);
    heap.insert(itemHigh);
    heap.insert(itemCritical);
    heap.insert(itemMedium);

    // Verify peek returns highest priority (Critical, 90)
    const peeked = heap.peek();
    assert.strictEqual(peeked.incidentId, 'CRITICAL');
    console.log('✔ Heap peek verified');

    // Extract elements and check sorting order
    const sorted = heap.getAllPrioritized();
    assert.strictEqual(sorted[0].incidentId, 'CRITICAL');
    assert.strictEqual(sorted[1].incidentId, 'HIGH');
    assert.strictEqual(sorted[2].incidentId, 'MEDIUM');
    assert.strictEqual(sorted[3].incidentId, 'LOW');
    console.log('✔ Heap elements sorted priority order verified');

    // Test secondary priority key (severity weighting)
    const heapSecondary = new MaxHeap();
    // Same riskScore, different severities
    const itemA = { riskScore: 60, severity: 'Medium', incidentId: 'A' };
    const itemB = { riskScore: 60, severity: 'High', incidentId: 'B' };
    heapSecondary.insert(itemA);
    heapSecondary.insert(itemB);
    const top = heapSecondary.extractMax();
    assert.strictEqual(top.incidentId, 'B'); // High weight (75) vs Medium weight (50)
    console.log('✔ Heap secondary priority key (severity weight) verified');

    // 4. Test priority recalculation integrated via Incident Service
    console.log('Testing Incident Service priority triggers...');
    
    // Create Low Incident on Node 1
    const incLow = await incidentService.createIncident({
      nodeId: testNode1._id,
      riskScore: 20,
      title: 'Low Alert Node 1',
      description: 'Test Low incident.',
      source: 'Simulation'
    }, { user: testUser });

    // Create High Incident on Node 2
    const incHigh = await incidentService.createIncident({
      nodeId: testNode2._id,
      riskScore: 80,
      title: 'High Alert Node 2',
      description: 'Test High incident.',
      source: 'Simulation'
    }, { user: testUser });

    // Verify prioritized queue positions
    const queue = await incidentPriorityService.getPrioritizedQueue();
    const testQueueItems = queue.filter(item => [testNode1._id.toString(), testNode2._id.toString()].includes(item.nodeId?._id?.toString() || item.nodeId?.toString()));
    
    assert.strictEqual(testQueueItems.length, 2);
    assert.strictEqual(testQueueItems[0].incidentId, incHigh.incidentId); // 80 risk should be first
    assert.strictEqual(testQueueItems[1].incidentId, incLow.incidentId);  // 20 risk should be second
    console.log('✔ Incident creation triggered priority recalculation successfully');

    // Test updating priority
    await incidentService.updateIncident(incLow.incidentId, {
      riskScore: 95
    }, { user: testUser });

    const queueUpdated = await incidentPriorityService.getPrioritizedQueue();
    const testQueueUpdatedItems = queueUpdated.filter(item => [testNode1._id.toString(), testNode2._id.toString()].includes(item.nodeId?._id?.toString() || item.nodeId?.toString()));
    assert.strictEqual(testQueueUpdatedItems[0].incidentId, incLow.incidentId); // Now 95 risk, should be first
    console.log('✔ Incident risk update correctly re-sorted priority queue');

    // 5. Test Priority Dashboard statistics
    console.log('Testing Priority Dashboard analytics...');
    const stats = await incidentPriorityService.getPriorityDashboard();
    assert.ok(stats.criticalCount >= 1); // 95 risk -> Critical
    assert.ok(stats.highCount >= 1);     // 80 risk -> High
    console.log('✔ Dashboard statistics aggregation verified');

    // 6. Test resolution removing from active priority queue
    console.log('Testing Incident Resolution removal...');
    await incidentService.resolveIncident(incLow.incidentId, { user: testUser });

    const queuePostResolve = await incidentPriorityService.getPrioritizedQueue();
    const resolvedInQueue = queuePostResolve.some(item => item.incidentId === incLow.incidentId);
    assert.strictEqual(resolvedInQueue, false);
    console.log('✔ Resolved incident successfully removed from Priority Max Heap');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up
    if (testNode1) {
      await Incident.deleteMany({ nodeId: testNode1._id });
      await RailwayNode.deleteOne({ _id: testNode1._id });
    }
    if (testNode2) {
      await Incident.deleteMany({ nodeId: testNode2._id });
      await RailwayNode.deleteOne({ _id: testNode2._id });
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
