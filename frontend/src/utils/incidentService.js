import { api } from './api.js';

/**
 * Incident Service
 * Exposes API mapping functions for Incidents and Dashboards.
 */
export const incidentService = {
  getIncidents: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const res = await api.get(`/api/incidents${queryString ? `?${queryString}` : ''}`);
    return res;
  },

  getIncidentById: async (id) => {
    return api.get(`/api/incidents/${id}`);
  },

  getOpenIncidents: async () => {
    return api.get('/api/incidents/open');
  },

  getCriticalIncidents: async () => {
    return api.get('/api/incidents/critical');
  },

  resolveIncident: async (id) => {
    return api.post(`/api/incidents/${id}/resolve`, {}); // wait, post/patch depends on controller. Our controller accepts PATCH (or POST)
    // Wait, let's use PATCH since we defined PATCH routes in the backend router!
  },

  closeIncident: async (id) => {
    return api.patch(`/api/incidents/${id}/close`, {});
  },

  resolveIncident: async (id) => {
    return api.patch(`/api/incidents/${id}/resolve`, {});
  },

  assignTeam: async (id, assignedTeam) => {
    return api.patch(`/api/incidents/${id}/assign`, { assignedTeam });
  },

  getDashboardStats: async () => {
    return api.get('/api/dashboard/incidents');
  },

  getPrioritizedQueue: async () => {
    return api.get('/api/incidents/prioritized');
  },

  getPriorityDashboard: async () => {
    return api.get('/api/incidents/priority-dashboard');
  },

  getIncidentPriorityRank: async (id) => {
    return api.get(`/api/incidents/priority/${id}`);
  }
};

export default incidentService;
