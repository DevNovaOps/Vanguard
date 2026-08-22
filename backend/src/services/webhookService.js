import webhookRepository from '../repositories/webhookRepository.js';
import auditService from './auditService.js';
import { getIO } from '../config/socket.js';

// Centralized Event Registry
export const EVENT_REGISTRY = {
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION',
  RISK_THRESHOLD_EXCEEDED: 'RISK_THRESHOLD_EXCEEDED',
  RISK_LEVEL_CHANGED: 'RISK_LEVEL_CHANGED',
  INCIDENT_CREATED: 'INCIDENT_CREATED',
  INCIDENT_UPDATED: 'INCIDENT_UPDATED',
  INCIDENT_RESOLVED: 'INCIDENT_RESOLVED',
  INCIDENT_CLOSED: 'INCIDENT_CLOSED',
  AGENT_ACTION_EXECUTED: 'AGENT_ACTION_EXECUTED',
  MITIGATION_EXECUTED: 'MITIGATION_EXECUTED',
  SIMULATION_STARTED: 'SIMULATION_STARTED',
  SIMULATION_COMPLETED: 'SIMULATION_COMPLETED',
  AUDIT_CRITICAL: 'AUDIT_CRITICAL'
};

// Safe Socket.IO emission helper
function emitWebhookSocket(eventName, payload) {
  try {
    const io = getIO();
    io.emit(eventName, payload);
    console.log(`[WEBHOOK-SOCKET] Emitted ${eventName} with ID ${payload.webhookId}`);
  } catch (error) {
    console.warn(`[WEBHOOK-SOCKET] Socket emission failed: ${error.message}`);
  }
}

export const webhookService = {
  /**
   * Create a Webhook subscription
   */
  async createWebhook(data, req) {
    // Validate subscribedEvents
    const validEvents = Object.values(EVENT_REGISTRY);
    const subscribedEvents = data.subscribedEvents || [];
    for (const event of subscribedEvents) {
      if (!validEvents.includes(event)) {
        const error = new Error(`Invalid event type in subscription list: ${event}`);
        error.statusCode = 400;
        throw error;
      }
    }

    const webhook = await webhookRepository.create({
      ...data,
      createdBy: req?.user?._id || null
    });

    // Audit Log
    await auditService.logEvent({
      req,
      module: 'Webhook',
      action: 'WEBHOOK_CREATED',
      description: `Created webhook subscription: ${webhook.name}`,
      severity: 'Info',
      metadata: { webhookId: webhook.webhookId, endpoint: webhook.endpoint }
    });

    // Socket Emit
    emitWebhookSocket('webhook:create', {
      webhookId: webhook.webhookId,
      name: webhook.name,
      endpoint: webhook.endpoint,
      isActive: webhook.isActive,
      status: webhook.status,
      timestamp: new Date()
    });

    return webhook;
  },

  /**
   * Get configured webhooks
   */
  async getWebhooks() {
    return await webhookRepository.findAll();
  },

  /**
   * Get webhook by ID or webhookId
   */
  async getWebhookById(id) {
    const webhook = await webhookRepository.findById(id);
    if (!webhook) {
      const error = new Error(`Webhook with ID '${id}' not found`);
      error.statusCode = 404;
      throw error;
    }
    return webhook;
  },

  /**
   * Update a Webhook configuration
   */
  async updateWebhook(id, updateData, req) {
    let webhook = await this.getWebhookById(id);

    // Validate subscribedEvents if updated
    if (updateData.subscribedEvents) {
      const validEvents = Object.values(EVENT_REGISTRY);
      for (const event of updateData.subscribedEvents) {
        if (!validEvents.includes(event)) {
          const error = new Error(`Invalid event type in subscription list: ${event}`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    webhook = await webhookRepository.update(webhook._id, updateData);

    // Audit Log
    await auditService.logEvent({
      req,
      module: 'Webhook',
      action: 'WEBHOOK_UPDATED',
      description: `Updated webhook subscription: ${webhook.name}`,
      severity: 'Info',
      metadata: { webhookId: webhook.webhookId }
    });

    // Socket Emit
    emitWebhookSocket('webhook:update', {
      webhookId: webhook.webhookId,
      name: webhook.name,
      endpoint: webhook.endpoint,
      isActive: webhook.isActive,
      status: webhook.status,
      timestamp: new Date()
    });

    return webhook;
  },

  /**
   * Delete a Webhook
   */
  async deleteWebhook(id, req) {
    const webhook = await webhookRepository.deleteById(id);
    if (!webhook) {
      const error = new Error(`Webhook not found`);
      error.statusCode = 404;
      throw error;
    }

    // Deliveries will be handled by foreign key ON DELETE CASCADE, or left orphaned if not configured.
    // In our repository pattern we don't have deleteMany for deliveries by webhookId, 
    // but the ID logic is separated.

    // Audit Log
    await auditService.logEvent({
      req,
      module: 'Webhook',
      action: 'WEBHOOK_DELETED',
      description: `Deleted webhook subscription: ${webhook.name}`,
      severity: 'Warning',
      metadata: { webhookId: webhook.webhookId }
    });

    // Socket Emit
    emitWebhookSocket('webhook:update', {
      webhookId: webhook.webhookId,
      deleted: true,
      timestamp: new Date()
    });

    return webhook;
  },

  /**
   * Activate Webhook
   */
  async activateWebhook(id, req) {
    return await this.updateWebhook(id, { isActive: true, status: 'Active' }, req);
  },

  /**
   * Deactivate Webhook
   */
  async deactivateWebhook(id, req) {
    return await this.updateWebhook(id, { isActive: false, status: 'Inactive' }, req);
  },

  /**
   * Trigger an Event
   * Searches active webhooks subscribed to eventType and fires them.
   */
  async triggerEvent(eventType, payload, req) {
    try {
      const activeWebhooks = await webhookRepository.findActiveByEvent(eventType);

      console.log(`[WEBHOOK-SERVICE] Event ${eventType} triggered. Found ${activeWebhooks.length} active subscriber(s).`);

      // Fire each webhook asynchronously
      activeWebhooks.forEach(webhook => {
        this.triggerWebhook(webhook, eventType, payload).catch(err => {
          console.error(`[WEBHOOK-DISPATCH-ERROR] Webhook ${webhook.webhookId} trigger failed: ${err.message}`);
        });
      });
    } catch (error) {
      console.error(`[WEBHOOK-SERVICE-ERROR] Failed to dispatch event ${eventType}: ${error.message}`);
    }
  },

  /**
   * Perform Webhook Dispatch (Handling HTTP or Mock Integrations)
   */
  async triggerWebhook(webhook, eventType, payload, retryCount = 0, deliveryDocId = null) {
    const start = Date.now();
    let responseCode = null;
    let responseBody = '';
    let success = false;
    let isTimeout = false;

    const endpoint = webhook.endpoint;
    const isMock = this.isMockUrl(endpoint);

    // Parse mock response flag from query params
    const mockOutcome = this.parseMockResponseFlag(endpoint);

    if (isMock) {
      // Execute Mock Target Provider simulation
      const mockResult = await this.simulateMockProvider(endpoint, mockOutcome);
      responseCode = mockResult.responseCode;
      responseBody = mockResult.responseBody;
      success = mockResult.success;
      isTimeout = mockResult.isTimeout;
      // Inject slight artificial latency
      const latencyDelay = mockResult.isTimeout ? 5000 : (50 + Math.floor(Math.random() * 150));
      await delay(latencyDelay);
    } else {
      // Execute Actual HTTP request
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(endpoint, {
          method: webhook.method,
          headers: {
            'Content-Type': 'application/json',
            ...(webhook.headers || {})
          },
          body: webhook.method !== 'GET' ? JSON.stringify({
            event: eventType,
            webhookId: webhook.webhookId,
            timestamp: new Date(),
            payload
          }) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        responseCode = response.status;
        responseBody = await response.text();
        success = response.ok;
      } catch (err) {
        responseCode = err.name === 'AbortError' ? 408 : 500;
        responseBody = `Error: ${err.message}`;
        success = false;
        isTimeout = err.name === 'AbortError';
      }
    }

    const latency = Date.now() - start;

    // Determine status of delivery
    let deliveryStatus = success ? 'Success' : 'Failed';
    if (!success && retryCount < 3) {
      deliveryStatus = 'Retrying';
    }

    // Persist Delivery log in DB
    let deliveryLog;
    if (deliveryDocId) {
      await webhookRepository.updateDelivery(deliveryDocId, {
        status: deliveryStatus,
        responseCode,
        responseBody: typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody,
        latency,
        retryCount,
      });
      deliveryLog = await webhookRepository.findDeliveryById(deliveryDocId);
    } else {
      deliveryLog = await webhookRepository.createDelivery({
        webhookId: webhook.webhookId,
        eventType,
        payload,
        responseCode,
        responseBody: typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody,
        latency,
        status: deliveryStatus,
        retryCount
      });
    }

    // Process metric updates and status switches on the Webhook configuration
    await webhookRepository.incrementStats(webhook._id, success, latency, responseCode);
    const updatedWebhook = await webhookRepository.findById(webhook._id);
    if (!success && updatedWebhook.successRate < 90) {
      await webhookRepository.update(webhook._id, { status: 'Error' });
    }

    // Socket Emit
    emitWebhookSocket('webhook:delivery', {
      id: deliveryLog.deliveryId,
      webhookId: webhook.webhookId,
      eventType,
      status: deliveryStatus,
      responseCode,
      latency,
      timestamp: deliveryLog.timestamp
    });

    if (success) {
      emitWebhookSocket('webhook:success', {
        webhookId: webhook.webhookId,
        eventType,
        latency,
        timestamp: new Date()
      });
    } else {
      emitWebhookSocket('webhook:failed', {
        webhookId: webhook.webhookId,
        eventType,
        error: isTimeout ? 'Timeout' : responseBody,
        timestamp: new Date()
      });

      if (retryCount < 3) {
        const nextRetry = retryCount + 1;
        const delayMs = process.env.NODE_ENV === 'test' ? nextRetry * 100 : nextRetry * 2000;
        setTimeout(() => {
          this.triggerWebhook(webhook, eventType, payload, nextRetry, deliveryLog._id).catch(() => {});
        }, delayMs);
      } else {
        await auditService.logEvent({
          req: null,
          module: 'Webhook',
          action: 'WEBHOOK_FAILED',
          description: `Webhook delivery failed for event ${eventType}: ${webhook.name}`,
          severity: 'Warning',
          metadata: { webhookId: webhook.webhookId, eventType, responseCode }
        });
      }
    }

    return deliveryLog;
  },

  /**
   * Test Webhook Endpoint with dummy payload
   */
  async testWebhook(id, req) {
    const webhook = await this.getWebhookById(id);
    const testPayload = {
      test: true,
      message: 'This is a test notification from Vanguard ARC Webhook Center',
      triggeredAt: new Date()
    };

    // Log Webhook Tested Audit
    await auditService.logEvent({
      req,
      module: 'Webhook',
      action: 'WEBHOOK_TESTED',
      description: `Tested webhook subscription: ${webhook.name}`,
      severity: 'Info',
      metadata: { webhookId: webhook.webhookId }
    });

    // Dispatch trigger
    return await this.triggerWebhook(webhook, 'WEBHOOK_TESTED', testPayload);
  },

  /**
   * Manually trigger a retry for a specific failed delivery
   */
  async retryFailedDelivery(deliveryId, req) {
    const delivery = await webhookRepository.findDeliveryById(deliveryId);
    if (!delivery) {
      const error = new Error(`Delivery log ${deliveryId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const webhook = await webhookRepository.findByWebhookId(delivery.webhookId);
    if (!webhook) {
      const error = new Error(`Webhook ${delivery.webhookId} associated with this delivery not found`);
      error.statusCode = 404;
      throw error;
    }

    // Force trigger webhook dispatch with reset retry count
    return await this.triggerWebhook(webhook, delivery.eventType, delivery.payload, 0, delivery._id);
  },

  /**
   * Fetch Webhook Event Delivery Logs
   */
  async getWebhookDeliveries(params = {}) {
    const deliveries = await webhookRepository.findDeliveries({
      status: params.status,
      eventType: params.eventType,
      webhookId: params.webhookId
    });
    
    // Minimal mock for pagination structure since we don't need fully implemented pagination in the repo for this exercise
    return {
      deliveries,
      pagination: {
        page: 1,
        limit: 100,
        total: deliveries.length,
        pages: 1
      }
    };
  },

  /**
   * Retrieve and compile Webhook Statistics
   */
  async getWebhookStatistics() {
    const stats = await webhookRepository.getStatistics();
    
    const deliveries = await webhookRepository.findDeliveries();
    const successfulDeliveries = deliveries.filter(d => d.status === 'Success').length;
    const failedDeliveries = deliveries.filter(d => d.status === 'Failed').length;

    return {
      totalWebhooks: stats.totalWebhooks,
      activeWebhooks: stats.activeWebhooks,
      successfulDeliveries,
      failedDeliveries,
      averageLatency: stats.averageLatency,
      successRate: stats.successRate
    };
  },

  /**
   * Calculate Health Score based on success rate and latency metrics
   */
  calculateHealthScore(successRate, averageLatency) {
    // Latency scoring: <=200ms is 100, linear decrease to 0 at 1200ms
    const latencyScore = averageLatency <= 200 ? 100 : Math.max(0, 100 - ((averageLatency - 200) / 10));
    return Math.round((successRate * 0.7) + (latencyScore * 0.3));
  },

  /**
   * Helper to verify if url belongs to mock integrations
   */
  isMockUrl(url) {
    const lower = url.toLowerCase();
    return (
      lower.includes('slack.com') ||
      lower.includes('pagerduty.com') ||
      lower.includes('scada.internal') ||
      lower.includes('email.internal') ||
      lower.includes('teams.microsoft') ||
      lower.includes('mock')
    );
  },

  /**
   * Parse target outcome flag
   */
  parseMockResponseFlag(url) {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('mockResponse') || 'success';
    } catch (e) {
      if (url.includes('mockResponse=fail')) return 'fail';
      if (url.includes('mockResponse=timeout')) return 'timeout';
      return 'success';
    }
  },

  /**
   * Mock target provider request simulator
   */
  async simulateMockProvider(url, outcome) {
    if (outcome === 'fail') {
      return {
        responseCode: 500,
        responseBody: 'Mock Destination Server Error',
        success: false,
        isTimeout: false
      };
    }
    if (outcome === 'timeout') {
      return {
        responseCode: 408,
        responseBody: 'Mock Connection Timeout (5000ms limit reached)',
        success: false,
        isTimeout: true
      };
    }

    // Successful mock cases
    const lower = url.toLowerCase();
    if (lower.includes('slack.com')) {
      return { responseCode: 200, responseBody: 'ok', success: true };
    }
    if (lower.includes('pagerduty.com')) {
      return { responseCode: 202, responseBody: JSON.stringify({ status: 'success', message: 'Event processed' }), success: true };
    }
    if (lower.includes('scada.internal') || lower.includes('scada')) {
      return { responseCode: 200, responseBody: JSON.stringify({ success: true, message: 'Telemetry updated' }), success: true };
    }
    if (lower.includes('email.internal') || lower.includes('email')) {
      return { responseCode: 200, responseBody: JSON.stringify({ message: 'Email queued' }), success: true };
    }
    if (lower.includes('teams.microsoft') || lower.includes('teams')) {
      return { responseCode: 200, responseBody: '1', success: true };
    }

    // Generic Mock Fallback
    return { responseCode: 200, responseBody: 'Mock response success', success: true };
  }
};

// Internal delay runner
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default webhookService;
