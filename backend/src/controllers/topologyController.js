import RailwayNode from '../models/RailwayNode.js';
import RailwayConnection from '../models/RailwayConnection.js';

// Static mapping of mock details for nodes to preserve the frontend simulation and heatmap
const mockNodeDetails = {
  'DLI': { sensors: 24, riskScore: 12, lastMaintenance: '2026-05-12' },
  'GGN': { sensors: 16, riskScore: 8, lastMaintenance: '2026-06-01' },
  'JP': { sensors: 30, riskScore: 18, lastMaintenance: '2026-05-15' },
  'AII': { sensors: 22, riskScore: 14, lastMaintenance: '2026-05-22' },
  'MJ': { sensors: 14, riskScore: 20, lastMaintenance: '2026-05-08' },
  'ABR': { sensors: 12, riskScore: 11, lastMaintenance: '2026-05-28' },
  'PNU': { sensors: 18, riskScore: 24, lastMaintenance: '2026-05-19' },
  'MSH': { sensors: 20, riskScore: 16, lastMaintenance: '2026-05-26' },
  'ADI': { sensors: 32, riskScore: 8, lastMaintenance: '2026-05-18' },
  'ND': { sensors: 15, riskScore: 10, lastMaintenance: '2026-06-02' },
  'ANND': { sensors: 18, riskScore: 12, lastMaintenance: '2026-05-30' },
  'BRC': { sensors: 18, riskScore: 45, lastMaintenance: '2026-04-28' },
  'BH': { sensors: 14, riskScore: 22, lastMaintenance: '2026-05-10' },
  'ST': { sensors: 28, riskScore: 15, lastMaintenance: '2026-05-20' },
  'NVS': { sensors: 10, riskScore: 9, lastMaintenance: '2026-06-03' },
  'BL': { sensors: 16, riskScore: 14, lastMaintenance: '2026-05-25' },
  'VAPI': { sensors: 20, riskScore: 19, lastMaintenance: '2026-05-14' },
  'PLG': { sensors: 12, riskScore: 11, lastMaintenance: '2026-05-29' },
  'MMCT': { sensors: 22, riskScore: 7, lastMaintenance: '2026-05-24' }
};

// Static mapping of mock load/corridor details for connections to preserve SVG line styles and data packets flow
const mockConnectionDetails = {
  'DLI-GGN': { load: 45, name: 'Delhi–Gurugram Link' },
  'GGN-JP': { load: 60, name: 'Gurugram–Jaipur Route' },
  'JP-AII': { load: 55, name: 'Jaipur–Ajmer Line' },
  'AII-MJ': { load: 50, name: 'Ajmer–Marwar Junction Route' },
  'MJ-ABR': { load: 40, name: 'Marwar–Abu Road Line' },
  'ABR-PNU': { load: 35, name: 'Abu Road–Palanpur Route' },
  'PNU-MSH': { load: 48, name: 'Palanpur–Mahesana Corridor' },
  'MSH-ADI': { load: 52, name: 'Mahesana–Ahmedabad Link' },
  'ADI-ND': { load: 65, name: 'Ahmedabad–Nadiad Line' },
  'ND-ANND': { load: 70, name: 'Nadiad–Anand Route' },
  'ANND-BRC': { load: 72, name: 'Anand–Vadodara Link' },
  'BRC-BH': { load: 88, name: 'Vadodara–Bharuch Corridor' },
  'BH-ST': { load: 78, name: 'Bharuch–Surat Main Line' },
  'ST-NVS': { load: 68, name: 'Surat–Navsari Link' },
  'NVS-BL': { load: 62, name: 'Navsari–Valsad Line' },
  'BL-VAPI': { load: 58, name: 'Valsad–Vapi Route' },
  'VAPI-PLG': { load: 75, name: 'Vapi–Palghar Main Line' },
  'PLG-MMCT': { load: 82, name: 'Palghar–Mumbai Central Corridor' }
};

/**
 * Helper to normalize and map database nodeType to frontend-compatible nodeType key.
 */
const normalizeNodeType = (type) => {
  const mapping = {
    'Station': 'station',
    'Junction': 'junction',
    'Depot': 'depot',
    'PowerHub': 'power_hub',
    'SignalTower': 'signal'
  };
  return mapping[type] || type.toLowerCase();
};

/**
 * Helper to normalize database status value to frontend status key.
 */
const normalizeStatus = (status) => {
  const mapping = {
    'Active': 'healthy',
    'Inactive': 'critical',
    'Maintenance': 'maintenance',
    'healthy': 'healthy',
    'warning': 'warning',
    'critical': 'critical',
    'maintenance': 'maintenance'
  };
  return mapping[status] || 'healthy';
};

/**
 * Helper to normalize connection status.
 */
const normalizeConnectionStatus = (status) => {
  const mapping = {
    'Active': 'active',
    'Inactive': 'inactive',
    'Maintenance': 'maintenance',
    'active': 'active',
    'warning': 'warning',
    'critical': 'critical'
  };
  return mapping[status] || 'active';
};

/**
 * @desc    Get aggregated network topology
 * @route   GET /api/network/topology
 * @access  Private
 */
export const getTopology = async (req, res, next) => {
  try {
    const dbNodes = await RailwayNode.find({});
    const dbConnections = await RailwayConnection.find({}).populate('sourceNode targetNode');

    // Map database nodes to frontend structure
    const nodes = dbNodes.map(node => {
      const mockDetails = mockNodeDetails[node.nodeCode] || { sensors: 10, riskScore: 15, lastMaintenance: new Date().toISOString().split('T')[0] };
      return {
        id: node.nodeCode,
        name: node.nodeName,
        type: normalizeNodeType(node.nodeType),
        zone: node.region,
        lat: node.latitude,
        lng: node.longitude,
        status: normalizeStatus(node.status),
        sensors: mockDetails.sensors,
        riskScore: mockDetails.riskScore,
        lastMaintenance: mockDetails.lastMaintenance
      };
    });

    // Map database connections to frontend routes structure
    const connections = dbConnections.map(conn => {
      if (!conn.sourceNode || !conn.targetNode) return null;

      const key = `${conn.sourceNode.nodeCode}-${conn.targetNode.nodeCode}`;
      const reverseKey = `${conn.targetNode.nodeCode}-${conn.sourceNode.nodeCode}`;
      const mockDetails = mockConnectionDetails[key] || mockConnectionDetails[reverseKey] || { load: 50, name: `${conn.sourceNode.nodeName} - ${conn.targetNode.nodeName}` };

      return {
        id: conn._id.toString(),
        from: conn.sourceNode.nodeCode,
        to: conn.targetNode.nodeCode,
        name: mockDetails.name,
        distance: conn.distance,
        status: normalizeConnectionStatus(conn.status),
        load: mockDetails.load
      };
    }).filter(conn => conn !== null);

    res.status(200).json({
      success: true,
      nodes,
      connections
    });
  } catch (error) {
    next(error);
  }
};
