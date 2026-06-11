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
import Webhook from '../src/models/Webhook.js';
import WebhookDelivery from '../src/models/WebhookDelivery.js';
import AuditLog from '../src/models/AuditLog.js';
import RailwayNode from '../src/models/RailwayNode.js';
import User from '../src/models/User.js';

// Import Services & Sockets
import { initSocket } from '../src/config/socket.js';
import webhookService, { EVENT_REGISTRY } from '../src/services/webhookService.js';
import auditService from '../src/services/auditService.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runTests = async () => {
  process.env.NODE_ENV = 'test';
  console.log('=== STARTING MODULE 14 WEBHOOK CENTER TESTS ===');

  // Initialize dummy HTTP server for Socket.io
  const dummyServer = http.createServer();
  initSocket(dummyServer);
  console.log('✔ Socket.IO initialized mock interface');

  // Connect to Database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vanguard';
  await mongoose.connect(mongoUri);
  console.log('✔ Connected to MongoDB');


  // Clean old webhooks, delivery logs, and audit logs
  await Webhook.deleteMany({});
  await WebhookDelivery.deleteMany({});
  await AuditLog.collection.deleteMany({});
  await User.deleteMany({ email: 'webhook_test_admin@vanguardarc.in' });
  console.log('✔ Cleared historical records for clean state testing');

  let testAdmin = null;

  try {
    // 0. Setup Test Admin User
    testAdmin = await User.create({
      name: 'Webhook Administrator',
      email: 'webhook_test_admin@vanguardarc.in',
      password: 'Password123!',
      role: 'Admin',
      department: 'IT Infrastructure',
      isActive: true
    });

    const mockRequest = { user: testAdmin };

    // ============================================
    // TEST 1: CRUD Operations for Webhooks
    // ============================================
    console.log('\n[Test 1] Running Webhook CRUD assertions...');
    
    // Create Webhook
    const webhookData = {
      name: 'Slack Integration Target',
      description: 'Sends critical railway telemetry and incident alerts to operations Slack channel',
      endpoint: 'https://slack.com/services/mock-endpoint-slug',
      method: 'POST',
      subscribedEvents: [EVENT_REGISTRY.INCIDENT_CREATED, EVENT_REGISTRY.COMPLIANCE_VIOLATION],
      headers: { 'X-Vanguard-Auth': 'TokenSecretXYZ' }
    };

    const webhook = await webhookService.createWebhook(webhookData, mockRequest);
    assert.ok(webhook.webhookId.startsWith('WH-'));
    assert.strictEqual(webhook.name, 'Slack Integration Target');
    assert.strictEqual(webhook.status, 'Active');
    assert.strictEqual(webhook.isActive, true);
    assert.deepStrictEqual(webhook.subscribedEvents, [EVENT_REGISTRY.INCIDENT_CREATED, EVENT_REGISTRY.COMPLIANCE_VIOLATION]);
    console.log('✔ Webhook created successfully. Generated ID:', webhook.webhookId);

    // Verify Audit Log for creation
    const createAudit = await AuditLog.findOne({ action: 'WEBHOOK_CREATED' });
    assert.ok(createAudit);
    assert.strictEqual(createAudit.module, 'Webhook');
    assert.strictEqual(createAudit.username, 'Webhook Administrator');
    console.log('✔ Creation audit trail generated successfully');

    // Get Webhooks list
    const list = await webhookService.getWebhooks();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].webhookId, webhook.webhookId);
    console.log('✔ Get all webhooks configuration returned correct count');

    // Get Webhook by ID
    const fetchedWh = await webhookService.getWebhookById(webhook.webhookId);
    assert.strictEqual(fetchedWh.name, webhook.name);
    console.log('✔ Get webhook by webhookId fetched successfully');

    // Update Webhook
    const updateData = {
      description: 'Updated description for operations channel',
      subscribedEvents: [EVENT_REGISTRY.INCIDENT_CREATED, EVENT_REGISTRY.COMPLIANCE_VIOLATION, EVENT_REGISTRY.RISK_LEVEL_CHANGED]
    };
    const updatedWh = await webhookService.updateWebhook(webhook.webhookId, updateData, mockRequest);
    assert.strictEqual(updatedWh.description, 'Updated description for operations channel');
    assert.strictEqual(updatedWh.subscribedEvents.length, 3);
    console.log('✔ Webhook updated successfully');

    // Verify Audit Log for update
    const updateAudit = await AuditLog.findOne({ action: 'WEBHOOK_UPDATED' });
    assert.ok(updateAudit);
    console.log('✔ Update audit trail generated successfully');

    // Deactivate Webhook
    const deactivatedWh = await webhookService.deactivateWebhook(webhook.webhookId, mockRequest);
    assert.strictEqual(deactivatedWh.isActive, false);
    assert.strictEqual(deactivatedWh.status, 'Inactive');
    console.log('✔ Deactivated webhook successfully');

    // Activate Webhook
    const activatedWh = await webhookService.activateWebhook(webhook.webhookId, mockRequest);
    assert.strictEqual(activatedWh.isActive, true);
    assert.strictEqual(activatedWh.status, 'Active');
    console.log('✔ Activated webhook successfully');


    // ============================================
    // TEST 2: Triggering and Mock Targets
    // ============================================
    console.log('\n[Test 2] Testing webhook triggering & mock response processing...');
    
    // Test active trigger for INCIDENT_CREATED
    const incidentPayload = {
      incidentId: 'INC-772834',
      title: 'Track Obstruction Detected',
      severity: 'Critical',
      status: 'Open'
    };

    // Run trigger event
    await webhookService.triggerEvent(EVENT_REGISTRY.INCIDENT_CREATED, incidentPayload, mockRequest);
    
    // Give it a brief delay to execute async dispatches
    await sleep(300);

    // Verify delivery logs
    let deliveryLogs = await WebhookDelivery.find({ webhookId: webhook.webhookId });
    assert.strictEqual(deliveryLogs.length, 1);
    assert.strictEqual(deliveryLogs[0].eventType, EVENT_REGISTRY.INCIDENT_CREATED);
    assert.strictEqual(deliveryLogs[0].status, 'Success');
    assert.strictEqual(deliveryLogs[0].responseCode, 200);
    assert.ok(deliveryLogs[0].deliveryId.startsWith('WE-'));
    console.log('✔ Successful mock delivery dispatch log recorded. Status:', deliveryLogs[0].status);


    // ============================================
    // TEST 3: Webhook Manual Test Trigger
    // ============================================
    console.log('\n[Test 3] Testing manual test trigger endpoint handler...');
    const testLog = await webhookService.testWebhook(webhook.webhookId, mockRequest);
    assert.ok(testLog);
    assert.strictEqual(testLog.eventType, 'WEBHOOK_TESTED');
    assert.strictEqual(testLog.status, 'Success');

    // Verify audit log for test
    const testAudit = await AuditLog.findOne({ action: 'WEBHOOK_TESTED' });
    assert.ok(testAudit);
    console.log('✔ Webhook manual test trigger and test audit generated successfully');


    // ============================================
    // TEST 4: Mock Provider Failure & Auto Retry Mechanics
    // ============================================
    console.log('\n[Test 4] Testing mock target failure and exponential backoff retry system...');
    
    // Create a webhook configured to fail
    const failingWebhookData = {
      name: 'Failing PagerDuty Target',
      description: 'Test webhook with mock failure responses to verify retry schedules',
      endpoint: 'https://pagerduty.com/integration?mockResponse=fail',
      method: 'POST',
      subscribedEvents: [EVENT_REGISTRY.INCIDENT_CLOSED]
    };

    const failingWh = await webhookService.createWebhook(failingWebhookData, mockRequest);
    
    // Trigger event INCIDENT_CLOSED
    await webhookService.triggerEvent(EVENT_REGISTRY.INCIDENT_CLOSED, { incidentId: 'FAIL-001' }, mockRequest);
    await sleep(4000);
    let failingLogs = await WebhookDelivery.find({ webhookId: failingWh.webhookId });
    assert.strictEqual(failingLogs.length, 1);
    assert.strictEqual(failingLogs[0].status, 'Failed');
    assert.strictEqual(failingLogs[0].retryCount, 3);
    console.log('✔ Retry exhaust limits verified. Status changed to "Failed" after 3 retries.');

    // Verify that failing audit event was generated on retry exhaust (with polling to prevent race conditions)
    let failAudit = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      failAudit = await AuditLog.findOne({ action: 'WEBHOOK_FAILED' });
      if (failAudit) break;
      await sleep(200);
    }
    assert.ok(failAudit);
    assert.strictEqual(failAudit.metadata.webhookId, failingWh.webhookId);
    console.log('✔ Webhook exhaust audit trail generated successfully');


    // ============================================
    // TEST 5: Manual Retry of Failed Delivery
    // ============================================
    console.log('\n[Test 5] Testing manual retry of failed deliveries...');
    
    // Manually retry the failed delivery log from Test 4
    const retriedLog = await webhookService.retryFailedDelivery(failingLogs[0].deliveryId, mockRequest);
    assert.ok(retriedLog);
    // Since mockResponse remains "fail", the retried dispatch will fail again and schedule retries.
    // The status of the retried log should start as 'Retrying' for retry count 0.
    assert.strictEqual(retriedLog.status, 'Retrying');
    assert.strictEqual(retriedLog.retryCount, 0);
    console.log('✔ Manual retry successfully executed and rescheduled.');
    await sleep(2000);

    // ============================================
    // TEST 6: Aggregated Statistics and Health Score
    // ============================================
    console.log('\n[Test 6] Validating stats compilation & health scoring models...');
    
    const statsObj = await webhookService.getWebhookStatistics();
    assert.strictEqual(statsObj.totalWebhooks, 2);
    assert.strictEqual(statsObj.activeWebhooks, 2);
    
    // We expect some successful dispatches (Slack & Test log) and some failed/retrying ones (PagerDuty)
    assert.ok(statsObj.successfulDeliveries >= 2);
    assert.ok(statsObj.failedDeliveries >= 1);
    
    // Calculate health score: successRate should be around 66% (2 successes out of 3)
    const successRate = statsObj.successRate;
    const avgLatency = statsObj.averageLatency;
    const healthScore = webhookService.calculateHealthScore(successRate, avgLatency);
    console.log(`✔ Stats calculated - Success Rate: ${successRate}%, Average Latency: ${avgLatency}ms, Health Score: ${healthScore}`);
    assert.ok(healthScore >= 0 && healthScore <= 100);
    console.log('✔ Health Score model successfully verified');


    // ============================================
    // TEST 7: Delete Webhook
    // ============================================
    console.log('\n[Test 7] Testing webhook deletion and associated cascade cleanses...');
    
    await webhookService.deleteWebhook(webhook.webhookId, mockRequest);
    const deletedWh = await Webhook.findOne({ webhookId: webhook.webhookId });
    assert.strictEqual(deletedWh, null);

    // Verify delivery logs cascade delete
    const deliveriesRemaining = await WebhookDelivery.find({ webhookId: webhook.webhookId });
    assert.strictEqual(deliveriesRemaining.length, 0);
    
    const deleteAudit = await AuditLog.findOne({ action: 'WEBHOOK_DELETED' });
    assert.ok(deleteAudit);
    console.log('✔ Webhook deletion & Cascade deliveries purge verified successfully.');

    console.log('\n=== ALL MODULE 14 WEBHOOK CENTER TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runTests();
