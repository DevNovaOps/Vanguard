import { api } from './api.js';

export const dashboardService = {
  getDashboardStats: async () => {
    return api.get('/api/dashboard/stats');
  }
};

export default dashboardService;
