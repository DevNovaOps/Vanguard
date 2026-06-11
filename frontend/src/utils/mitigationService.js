import { api } from './api.js';

/**
 * Mitigation Service
 * Exposes API mapping functions for Mitigation Center dashboard, list, and actions.
 */
export const mitigationService = {
  getMitigations: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return api.get(`/api/mitigations${queryString ? `?${queryString}` : ''}`);
  },

  getMitigationById: async (id) => {
    return api.get(`/api/mitigations/${id}`);
  },

  createMitigation: async (mitigationData) => {
    return api.post('/api/mitigations', mitigationData);
  },

  updateMitigationStatus: async (id, status, executionNotes) => {
    return api.patch(`/api/mitigations/${id}/status`, { status, executionNotes });
  },

  executeMitigation: async (id, executionNotes) => {
    return api.post(`/api/mitigations/${id}/execute`, { executionNotes });
  },

  getDashboardStats: async () => {
    return api.get('/api/mitigations/dashboard');
  }
};

export default mitigationService;
