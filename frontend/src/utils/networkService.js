import { api } from './api.js';

/**
 * Network Service
 * Exposes API mapping functions for Railway Nodes, Connections, and Network Topology.
 */
export const networkService = {
  getTopology: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const suffix = query ? `?${query}` : '';
    return api.get(`/api/network/topology${suffix}`);
  },

  getRoutes: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const suffix = query ? `?${query}` : '';
    return api.get(`/api/network/routes${suffix}`);
  },

  getCorridors: async () => {
    return api.get('/api/network/corridors');
  },

  getNodeConnections: async (nodeCode) => {
    return api.get(`/api/network/nodes/${nodeCode}/connections`);
  },

  getNodes: async () => {
    return api.get('/api/nodes');
  },

  getNodeById: async (id) => {
    return api.get(`/api/nodes/${id}`);
  },

  createNode: async (nodeData) => {
    return api.post('/api/nodes', nodeData);
  },

  updateNode: async (id, nodeData) => {
    return api.put(`/api/nodes/${id}`, nodeData);
  },

  deleteNode: async (id) => {
    return api.delete(`/api/nodes/${id}`);
  },

  getConnections: async () => {
    return api.get('/api/connections');
  },

  getConnectionById: async (id) => {
    return api.get(`/api/connections/${id}`);
  },

  createConnection: async (connData) => {
    return api.post('/api/connections', connData);
  },

  updateConnection: async (id, connData) => {
    return api.put(`/api/connections/${id}`, connData);
  },

  deleteConnection: async (id) => {
    return api.delete(`/api/connections/${id}`);
  }
};
