import { api } from './api.js';

/**
 * Frontend Webhook Service
 * Interacts with backend /api/webhooks endpoints.
 */
export const webhookService = {
  /**
   * Get all configured webhooks
   */
  getWebhooks: async () => {
    return api.get('/api/webhooks');
  },

  /**
   * Get webhook by ID
   */
  getWebhookById: async (id) => {
    return api.get(`/api/webhooks/${id}`);
  },

  /**
   * Create a new webhook subscription
   */
  createWebhook: async (webhookData) => {
    return api.post('/api/webhooks', webhookData);
  },

  /**
   * Update an existing webhook subscription
   */
  updateWebhook: async (id, webhookData) => {
    return api.patch(`/api/webhooks/${id}`, webhookData);
  },

  /**
   * Delete a webhook subscription
   */
  deleteWebhook: async (id) => {
    return api.delete(`/api/webhooks/${id}`);
  },

  /**
   * Test a webhook target by sending a mock event
   */
  testWebhook: async (id) => {
    return api.post(`/api/webhooks/${id}/test`);
  },

  /**
   * Toggle webhook status between active/inactive
   */
  toggleWebhookStatus: async (id, isActive) => {
    const endpoint = isActive ? 'activate' : 'deactivate';
    return api.post(`/api/webhooks/${id}/${endpoint}`);
  },

  /**
   * Get webhook delivery logs with pagination & filtering
   */
  getWebhookDeliveries: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        query.append(key, params[key]);
      }
    });
    return api.get(`/api/webhooks/deliveries?${query.toString()}`);
  },

  /**
   * Get general webhook statistics
   */
  getWebhookStats: async () => {
    return api.get('/api/webhooks/stats');
  },

  /**
   * Get dashboard specific webhook statistics
   */
  getDashboardWebhooks: async () => {
    return api.get('/api/dashboard/webhooks');
  },

  /**
   * Manually retry a failed delivery
   */
  retryDelivery: async (deliveryId) => {
    return api.post(`/api/webhooks/deliveries/${deliveryId}/retry`);
  }
};

export default webhookService;
