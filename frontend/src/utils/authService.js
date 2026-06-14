import { api } from './api.js';

/**
 * Authentication Service
 * Calls backend auth endpoints.
 */
export const authService = {
  loginUser: async (email, password) => {
    return api.post('/api/auth/login', { email, password });
  },

  loginUserWithOtp: async (email) => {
    return api.post('/api/auth/otp-login', { email });
  },

  forgotPassword: async (email) => {
    return api.post('/api/auth/forgot-password', { email });
  },

  sendResetLink: async (email) => {
    return api.post('/api/auth/send-reset-link', { email });
  },

  resetPassword: async (token, password) => {
    return api.post(`/api/auth/reset-password/${token}`, { password });
  },

  sendLoginOtp: async (email) => {
    return api.post('/api/auth/send-login-otp', { email });
  },

  verifyLoginOtp: async (email, otp) => {
    return api.post('/api/auth/verify-login-otp', { email, otp });
  },

  resendOtp: async (email) => {
    return api.post('/api/auth/resend-otp', { email });
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
