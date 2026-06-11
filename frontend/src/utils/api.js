/**
 * API Client Utility
 * Handles fetch requests, injects Authorization headers, and processes errors.
 */

const BASE_URL = ''; // Blank since Vite handles proxying of /api

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('arc_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token on unauthorized access
      localStorage.removeItem('arc_token');
      localStorage.removeItem('arc_user');
      // Trigger reload to redirect to /login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorMessage = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body }),
  put: (url, body, options) => request(url, { ...options, method: 'PUT', body }),
  patch: (url, body, options) => request(url, { ...options, method: 'PATCH', body }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
};
