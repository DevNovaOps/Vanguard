import { api } from './api.js';

/**
 * Authentication Service
 * Calls backend auth endpoints.
 */
export const authService = {
  loginUser: async (email, password) => {
    return api.post('/api/auth/login', { email, password });
  },

  registerUser: async (userData) => {
    return api.post('/api/auth/register', userData);
  },

  getUserProfile: async () => {
    return api.get('/api/auth/profile');
  },

  getAllUsers: async () => {
    return api.get('/api/auth/users');
  },

  approveAllUsers: async () => {
    return api.put('/api/auth/users/approve-all');
  },

  approveUser: async (id) => {
    return api.put(`/api/auth/users/${id}/approve`);
  },

  rejectUser: async (id) => {
    return api.delete(`/api/auth/users/${id}/reject`);
  },
};
