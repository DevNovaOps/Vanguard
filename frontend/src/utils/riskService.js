import { api } from './api.js';

/**
 * Risk Service
 * Exposes API mapping functions for Risk Score and Dashboard.
 */
export const riskService = {
  getRisks: async () => {
    return api.get('/api/risk');
  },

  getRiskByNodeId: async (nodeId) => {
    return api.get(`/api/risk/${nodeId}`);
  },

  getDashboardStats: async () => {
    return api.get('/api/risk/dashboard');
  },

  calculateRisks: async () => {
    return api.post('/api/risk/calculate');
  }
};
