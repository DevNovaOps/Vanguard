import { api } from './api.js';

/**
 * Autonomous AI Agent Service
 * Exposes API mapping functions for Telemetry Evaluation, Agent Actions list, and Dashboard stats.
 */
export const agentService = {
  evaluateTelemetry: async (telemetryData) => {
    return api.post('/api/agent/evaluate', telemetryData);
  },

  getActions: async () => {
    return api.get('/api/agent/actions');
  },

  getActionById: async (id) => {
    return api.get(`/api/agent/actions/${id}`);
  },

  getDashboardStats: async () => {
    return api.get('/api/agent/dashboard');
  }
};

export default agentService;
