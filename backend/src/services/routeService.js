import RouteSegment from '../models/RouteSegment.js';
import RailwayNode from '../models/RailwayNode.js';
import RailwayConnection from '../models/RailwayConnection.js';
import RiskScore from '../models/RiskScore.js';

// Static mappings to preserve simulation and heatmap features
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

export const routeService = {
  /**
   * Generates RouteSegment documents from existing RailwayConnection documents.
   */
  async generateRouteSegments() {
    const connections = await RailwayConnection.find({}).populate('sourceNode targetNode');
    let count = 0;
    for (const conn of connections) {
      if (!conn.sourceNode || !conn.targetNode) continue;

      const routeCode = `${conn.sourceNode.nodeCode}-${conn.targetNode.nodeCode}`;
      const exists = await RouteSegment.findOne({ routeCode });
      if (!exists) {
        // Straight line coordinates initially
        const coordinates = [
          [conn.sourceNode.latitude, conn.sourceNode.longitude],
          [conn.targetNode.latitude, conn.targetNode.longitude]
        ];

        let region = conn.sourceNode.region || 'National';
        if (conn.sourceNode.region !== conn.targetNode.region) {
          region = `${conn.sourceNode.region} - ${conn.targetNode.region} Link`;
        }

        // Parse mock route load & name details
        const mockDetails = mockConnectionDetails[routeCode] ||
          mockConnectionDetails[`${conn.targetNode.nodeCode}-${conn.sourceNode.nodeCode}`] ||
          { load: 50, name: `${conn.sourceNode.nodeName} - ${conn.targetNode.nodeName} Link` };

        await RouteSegment.create({
          routeCode,
          routeName: mockDetails.name,
          sourceNode: conn.sourceNode._id,
          targetNode: conn.targetNode._id,
          distance: conn.distance,
          coordinates,
          status: conn.status || 'Active',
          region
        });
        count++;
      }
    }
    console.log(`[ROUTE-SERVICE] Seeded ${count} RouteSegment documents from connections.`);
  },

  /**
   * Fetch all route segments with populated source/target details
   */
  async getRoutes() {
    const dbRoutes = await RouteSegment.find({}).populate('sourceNode targetNode');
    return dbRoutes.map(route => {
      if (!route.sourceNode || !route.targetNode) return null;
      const mockDetails = mockConnectionDetails[route.routeCode] ||
        mockConnectionDetails[`${route.targetNode.nodeCode}-${route.sourceNode.nodeCode}`] ||
        { load: 50 };
      return {
        id: route._id.toString(),
        routeCode: route.routeCode,
        routeName: route.routeName,
        from: route.sourceNode.nodeCode,
        to: route.targetNode.nodeCode,
        distance: route.distance,
        coordinates: route.coordinates,
        status: normalizeConnectionStatus(route.status),
        load: mockDetails.load,
        region: route.region
      };
    }).filter(r => r !== null);
  },

  /**
   * Compile full topology: nodes, routes, corridors, and statistics.
   */
  async getTopology() {
    const dbNodes = await RailwayNode.find({});
    const dbRoutes = await RouteSegment.find({}).populate('sourceNode targetNode');

    // Retrieve risk scores map to populate nodes correctly
    const riskScores = await RiskScore.find({});
    const riskMap = {};
    riskScores.forEach(r => {
      if (r.nodeId) riskMap[r.nodeId.toString()] = r.totalRisk;
    });

    const nodes = dbNodes.map(node => {
      const mockDetails = mockNodeDetails[node.nodeCode] || { sensors: 10, riskScore: 15, lastMaintenance: new Date().toISOString().split('T')[0] };
      const riskScore = riskMap[node._id.toString()] !== undefined ? riskMap[node._id.toString()] : mockDetails.riskScore;

      return {
        id: node.nodeCode,
        name: node.nodeName,
        type: normalizeNodeType(node.nodeType),
        zone: node.region,
        lat: node.latitude,
        lng: node.longitude,
        status: normalizeStatus(node.status),
        sensors: mockDetails.sensors,
        riskScore: riskScore,
        lastMaintenance: mockDetails.lastMaintenance
      };
    });

    const routes = dbRoutes.map(route => {
      if (!route.sourceNode || !route.targetNode) return null;
      const mockDetails = mockConnectionDetails[route.routeCode] ||
        mockConnectionDetails[`${route.targetNode.nodeCode}-${route.sourceNode.nodeCode}`] ||
        { load: 50 };
      return {
        id: route._id.toString(),
        routeCode: route.routeCode,
        routeName: route.routeName,
        from: route.sourceNode.nodeCode,
        to: route.targetNode.nodeCode,
        distance: route.distance,
        coordinates: route.coordinates,
        status: normalizeConnectionStatus(route.status),
        load: mockDetails.load,
        region: route.region
      };
    }).filter(r => r !== null);

    const corridors = await this.getCorridorsList(routes);

    // Compute Statistics
    const totalNodes = nodes.length;
    const totalRoutes = routes.length;
    const criticalNodes = nodes.filter(n => n.status === 'critical').length;
    const averageRisk = totalNodes > 0 ? parseFloat((nodes.reduce((sum, n) => sum + n.riskScore, 0) / totalNodes).toFixed(1)) : 0;

    const typeCounts = {};
    nodes.forEach(n => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    const statistics = {
      totalNodes,
      totalRoutes,
      criticalNodes,
      averageRisk,
      typeCounts
    };

    return {
      nodes,
      routes,
      // Fallback connections array for backward-compatibility with older frontends
      connections: routes,
      corridors,
      statistics
    };
  },

  /**
   * Build/group railway corridors based on region clustering
   */
  async getCorridorsList(routesInput) {
    const routes = routesInput || await this.getRoutes();
    const corridorMap = {};

    routes.forEach(route => {
      const key = route.region || 'National Network';
      if (!corridorMap[key]) {
        corridorMap[key] = {
          name: key,
          routesCount: 0,
          status: 'active'
        };
      }
      corridorMap[key].routesCount += 1;
      if (route.status === 'critical' || route.status === 'inactive') {
        corridorMap[key].status = 'critical';
      } else if (route.status === 'warning' && corridorMap[key].status !== 'critical') {
        corridorMap[key].status = 'warning';
      }
    });

    return Object.values(corridorMap);
  },

  /**
   * Get corridors representation
   */
  async getCorridors() {
    return await this.getCorridorsList();
  },

  /**
   * Get connections for a specific node
   */
  async getNodeConnections(nodeCode) {
    const node = await RailwayNode.findOne({ nodeCode });
    if (!node) {
      throw new Error(`Railway Node with code ${nodeCode} not found`);
    }

    const routes = await RouteSegment.find({
      $or: [{ sourceNode: node._id }, { targetNode: node._id }]
    }).populate('sourceNode targetNode');

    return routes.map(route => {
      if (!route.sourceNode || !route.targetNode) return null;
      const mockDetails = mockConnectionDetails[route.routeCode] ||
        mockConnectionDetails[`${route.targetNode.nodeCode}-${route.sourceNode.nodeCode}`] ||
        { load: 50 };
      return {
        id: route._id.toString(),
        routeCode: route.routeCode,
        routeName: route.routeName,
        from: route.sourceNode.nodeCode,
        to: route.targetNode.nodeCode,
        distance: route.distance,
        coordinates: route.coordinates,
        status: normalizeConnectionStatus(route.status),
        load: mockDetails.load,
        region: route.region
      };
    }).filter(r => r !== null);
  }
};

export default routeService;
