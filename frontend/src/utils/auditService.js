import { api } from './api.js';

/**
 * Frontend Audit Service
 * Interacts with backend /api/audit endpoints.
 */
export const auditService = {
  getAuditLogs: async (params = {}) => {
    // Construct query parameters string
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        query.append(key, params[key]);
      }
    });
    return api.get(`/api/audit?${query.toString()}`);
  },

  getAuditStats: async () => {
    return api.get('/api/audit/stats');
  },

  getDashboardAuditStats: async () => {
    return api.get('/api/dashboard/audit');
  },

  exportAuditLogs: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        query.append(key, params[key]);
      }
    });
    return api.get(`/api/audit/export?${query.toString()}`);
  }
};

export default auditService;
