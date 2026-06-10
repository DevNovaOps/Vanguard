import { api } from './api.js';

/**
 * Compliance Service
 * Exposes API mapping functions for Compliance Rules, Compliance Violations, and Dashboard.
 */
export const complianceService = {
  getRules: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return api.get(`/api/compliance/rules${queryString ? `?${queryString}` : ''}`);
  },

  getRuleById: async (id) => {
    return api.get(`/api/compliance/rules/${id}`);
  },

  createRule: async (ruleData) => {
    return api.post('/api/compliance/rules', ruleData);
  },

  updateRule: async (id, ruleData) => {
    return api.put(`/api/compliance/rules/${id}`, ruleData);
  },

  deleteRule: async (id) => {
    return api.delete(`/api/compliance/rules/${id}`);
  },

  getViolations: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return api.get(`/api/compliance/violations${queryString ? `?${queryString}` : ''}`);
  },

  getViolationById: async (id) => {
    return api.get(`/api/compliance/violations/${id}`);
  },

  getDashboardStats: async () => {
    return api.get('/api/compliance/dashboard');
  }
};
