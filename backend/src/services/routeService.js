import routeSegmentRepository from '../repositories/routeSegmentRepository.js';
import railwayNodeRepository from '../repositories/railwayNodeRepository.js';
import railwayConnectionRepository from '../repositories/railwayConnectionRepository.js';
import riskScoreRepository from '../repositories/riskScoreRepository.js';

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
    Station: 'station',
    Junction: 'junction',
    Depot: 'depot',
    PowerHub: 'power_hub',
    SignalTower: 'signal'
  };
  return mapping[type] || String(type).toLowerCase();
};

const normalizeStatus = (status) => {
  const mapping = {
    Active: 'healthy',
    Inactive: 'critical',
    Maintenance: 'maintenance',
    healthy: 'healthy',
    warning: 'warning',
    critical: 'critical',
    maintenance: 'maintenance'
  };
  return mapping[status] || 'healthy';
};

const normalizeConnectionStatus = (status) => {
  const mapping = {
    Active: 'active',
    Inactive: 'inactive',
    Maintenance: 'maintenance',
    active: 'active',
    warning: 'warning',
    critical: 'critical'
  };
  return mapping[status] || 'active';
};

const classifyRouteTier = (sourceNode, targetNode, sourceDegree = 0, targetDegree = 0) => {
  const sourceType = normalizeNodeType(sourceNode.nodeType);
  const targetType = normalizeNodeType(targetNode.nodeType);

  if (sourceType === 'junction' && targetType === 'junction') return 'major';
  if (sourceDegree >= 4 || targetDegree >= 4) return 'major';
  if (
    sourceType === 'junction' || targetType === 'junction' ||
    sourceType === 'depot' || targetType === 'depot'
  ) {
    return 'regional';
  }
  return 'local';
};

const deriveCorridorId = (region) => {
  if (!region) return 'NATIONAL';
  const base = region.split(' - ')[0].trim();
  return base.toUpperCase().replace(/\s+/g, '_');
};

const interpolateMidpoint = (coords) => {
  if (!coords || coords.length < 2) return coords || [];
  if (coords.length > 2) return coords;

  const [p1, p2] = coords;
  return [
    p1,
    [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
    p2
  ];
};

const formatRoute = (route, nodeDegreeMap = {}, mockOverrides = true) => {
  if (!route.sourceNode || !route.targetNode) return null;

  const mockDetails = mockOverrides
    ? (mockConnectionDetails[route.routeCode] ||
      mockConnectionDetails[`${route.targetNode.nodeCode}-${route.sourceNode.nodeCode}`])
    : null;

  const sourceDegree = nodeDegreeMap[route.sourceNode.nodeCode] || 0;
  const targetDegree = nodeDegreeMap[route.targetNode.nodeCode] || 0;
  const tier = route.tier || classifyRouteTier(route.sourceNode, route.targetNode, sourceDegree, targetDegree);

  return {
    id: route._id.toString(),
    routeCode: route.routeCode,
    routeName: route.routeName || mockDetails?.name || `${route.sourceNode.nodeName} – ${route.targetNode.nodeName}`,
    from: route.sourceNode.nodeCode,
    to: route.targetNode.nodeCode,
    distance: route.distance,
    coordinates: route.coordinates?.length >= 2 ? route.coordinates : interpolateMidpoint([
      [route.sourceNode.latitude, route.sourceNode.longitude],
      [route.targetNode.latitude, route.targetNode.longitude]
    ]),
    status: normalizeConnectionStatus(route.status),
    load: route.load ?? mockDetails?.load ?? Math.min(95, 30 + Math.floor((sourceDegree + targetDegree) * 8)),
    region: route.region,
    tier,
    corridorId: route.corridorId || deriveCorridorId(route.region)
  };
};

const buildNodeDegreeMap = (connections) => {
  const degreeMap = {};
  connections.forEach((conn) => {
    if (!conn.sourceNode || !conn.targetNode) return;
    degreeMap[conn.sourceNode.nodeCode] = (degreeMap[conn.sourceNode.nodeCode] || 0) + 1;
    degreeMap[conn.targetNode.nodeCode] = (degreeMap[conn.targetNode.nodeCode] || 0) + 1;
  });
  return degreeMap;
};

import { getPool } from '../config/database.js';

export const routeService = {
  /**
   * Generates RouteSegment documents from RailwayConnection documents.
   * Uses bulkWrite for performance.
   */
  async generateRouteSegments() {
    const connections = await railwayConnectionRepository.findAll();
    const degreeMap = buildNodeDegreeMap(connections);
    const pool = getPool();

    let upsertedCount = 0;
    let total = 0;

    for (const conn of connections) {
      if (!conn.sourceNode || !conn.targetNode) continue;
      total++;

      const routeCode = `${conn.sourceNode.nodeCode}-${conn.targetNode.nodeCode}`;
      const reverseCode = `${conn.targetNode.nodeCode}-${conn.sourceNode.nodeCode}`;
      const tier = classifyRouteTier(
        conn.sourceNode,
        conn.targetNode,
        degreeMap[conn.sourceNode.nodeCode],
        degreeMap[conn.targetNode.nodeCode]
      );

      let region = conn.sourceNode.region || 'National';
      if (conn.sourceNode.region !== conn.targetNode.region) {
        region = `${conn.sourceNode.region} - ${conn.targetNode.region} Link`;
      }

      const mockDetails = mockConnectionDetails[routeCode] ||
        mockConnectionDetails[reverseCode] ||
        { load: Math.min(95, 35 + Math.floor(Math.random() * 40)), name: `${conn.sourceNode.nodeName} – ${conn.targetNode.nodeName}` };

      const coordinates = interpolateMidpoint([
        [conn.sourceNode.latitude, conn.sourceNode.longitude],
        [conn.targetNode.latitude, conn.targetNode.longitude]
      ]);

      const payload = {
        routeCode,
        routeName: mockDetails.name,
        sourceNode: conn.sourceNode._id,
        targetNode: conn.targetNode._id,
        distance: conn.distance,
        coordinates,
        status: conn.status || 'Active',
        region,
        tier,
        corridorId: deriveCorridorId(region),
        loadPct: mockDetails.load
      };

      try {
        const existing = await routeSegmentRepository.findByCode(routeCode);
        if (!existing) {
          await routeSegmentRepository.create(payload);
          upsertedCount++;
        } else {
          await pool.execute(
            `UPDATE route_segments SET route_name=?, distance=?, status=?, region=?, tier=?, corridor_id=?, load_pct=? WHERE route_code=?`,
            [payload.routeName, payload.distance, payload.status, payload.region, payload.tier, payload.corridorId, payload.loadPct, routeCode]
          );
        }
      } catch (e) {
        console.error(`Failed to process route segment ${routeCode}`, e);
      }
    }

    if (total > 0) {
      console.log(`[ROUTE-SERVICE] Route segments synced via iteration: processed ${total} total.`);
    } else {
      console.log('[ROUTE-SERVICE] No route segments to generate.');
    }
  },

  async getRoutes(filters = {}) {
    let dbRoutes = await routeSegmentRepository.findAll();
    
    if (filters.region && filters.region !== 'All') {
      const regionRegex = new RegExp(filters.region, 'i');
      dbRoutes = dbRoutes.filter(r => regionRegex.test(r.region));
    }
    if (filters.tier) {
      dbRoutes = dbRoutes.filter(r => r.tier === filters.tier);
    }

    const connections = await railwayConnectionRepository.findAll();
    const degreeMap = buildNodeDegreeMap(connections);

    return dbRoutes
      .map((route) => formatRoute(route, degreeMap))
      .filter(Boolean);
  },

  async getTopology(filters = {}) {
    const [dbNodes, dbRoutes, riskScores] = await Promise.all([
      railwayNodeRepository.findAll(),
      routeSegmentRepository.findAll(),
      riskScoreRepository.findAll()
    ]);

    const connections = await railwayConnectionRepository.findAll();
    const degreeMap = buildNodeDegreeMap(connections);

    const riskMap = {};
    riskScores.forEach((r) => {
      if (r.nodeId) riskMap[(r.nodeId._id || r.nodeId).toString()] = r.totalRisk;
    });

    const nodes = dbNodes.map((node) => {
      const mockDetails = mockNodeDetails[node.nodeCode] || {
        sensors: 8 + (degreeMap[node.nodeCode] || 0) * 2,
        riskScore: 10 + Math.min(40, (degreeMap[node.nodeCode] || 0) * 3),
        lastMaintenance: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().split('T')[0]
      };
      const riskScore = riskMap[node._id.toString()] ?? mockDetails.riskScore;

      return {
        id: node.nodeCode,
        name: node.nodeName,
        type: normalizeNodeType(node.nodeType),
        zone: node.region,
        lat: node.latitude,
        lng: node.longitude,
        status: normalizeStatus(node.status),
        sensors: mockDetails.sensors,
        riskScore,
        lastMaintenance: mockDetails.lastMaintenance,
        connectionCount: degreeMap[node.nodeCode] || 0,
        isJunction: normalizeNodeType(node.nodeType) === 'junction'
      };
    });

    let routes = dbRoutes
      .map((route) => formatRoute(route, degreeMap))
      .filter(Boolean);

    if (filters.region && filters.region !== 'All') {
      routes = routes.filter((route) =>
        route.region.includes(filters.region) ||
        nodes.find((n) => n.id === route.from)?.zone === filters.region ||
        nodes.find((n) => n.id === route.to)?.zone === filters.region
      );
    }

    const corridors = this.buildCorridors(routes, nodes);
    const statistics = this.computeStatistics(nodes, routes, corridors);

    return {
      nodes,
      routes,
      connections: routes,
      corridors,
      statistics,
      renderingHints: {
        zoomLevels: {
          major: { maxZoom: 5, tiers: ['major'], nodeTypes: ['junction'] },
          regional: { minZoom: 6, maxZoom: 9, tiers: ['major', 'regional'], nodeTypes: ['junction', 'depot'] },
          local: { minZoom: 10, tiers: ['major', 'regional', 'local'], nodeTypes: ['station', 'junction', 'depot', 'power_hub', 'signal'] }
        }
      }
    };
  },

  buildCorridors(routesInput, nodesInput) {
    const routes = routesInput || [];
    const nodes = nodesInput || [];
    const corridorMap = {};

    routes.forEach((route) => {
      const corridorId = route.corridorId || deriveCorridorId(route.region);
      const corridorName = route.region?.split(' - ')[0] || 'National Network';

      if (!corridorMap[corridorId]) {
        corridorMap[corridorId] = {
          id: corridorId,
          name: corridorName,
          region: corridorName,
          routesCount: 0,
          nodeCodes: new Set(),
          coordinates: [],
          routeCodes: [],
          status: 'active',
          tier: 'major'
        };
      }

      const corridor = corridorMap[corridorId];
      corridor.routesCount += 1;
      corridor.routeCodes.push(route.routeCode);
      corridor.nodeCodes.add(route.from);
      corridor.nodeCodes.add(route.to);

      if (route.coordinates?.length >= 2) {
        corridor.coordinates.push(...route.coordinates);
      }

      if (route.status === 'critical' || route.status === 'inactive') {
        corridor.status = 'critical';
      } else if (route.status === 'warning' && corridor.status !== 'critical') {
        corridor.status = 'warning';
      }

      if (route.tier === 'local' && corridor.tier === 'major') {
        corridor.tier = 'regional';
      }
    });

    return Object.values(corridorMap).map((corridor) => {
      const corridorNodes = nodes.filter((n) => corridor.nodeCodes.has(n.id));
      const center = corridorNodes.length > 0
        ? {
          lat: corridorNodes.reduce((sum, n) => sum + n.lat, 0) / corridorNodes.length,
          lng: corridorNodes.reduce((sum, n) => sum + n.lng, 0) / corridorNodes.length
        }
        : null;

      return {
        id: corridor.id,
        name: corridor.name,
        region: corridor.region,
        routesCount: corridor.routesCount,
        routeCodes: corridor.routeCodes.slice(0, 50),
        nodeCount: corridor.nodeCodes.size,
        coordinates: corridor.coordinates.slice(0, 500),
        center,
        status: corridor.status,
        tier: corridor.tier
      };
    });
  },

  computeStatistics(nodes, routes, corridors) {
    const totalNodes = nodes.length;
    const totalRoutes = routes.length;
    const criticalNodes = nodes.filter((n) => n.status === 'critical').length;
    const averageRisk = totalNodes > 0
      ? parseFloat((nodes.reduce((sum, n) => sum + n.riskScore, 0) / totalNodes).toFixed(1))
      : 0;

    const typeCounts = {};
    nodes.forEach((n) => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    const tierCounts = { major: 0, regional: 0, local: 0 };
    routes.forEach((r) => {
      tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1;
    });

    const totalConnections = nodes.reduce((sum, n) => sum + (n.connectionCount || 0), 0) / 2;

    return {
      totalNodes,
      totalRoutes,
      totalConnections: Math.round(totalConnections),
      totalCorridors: corridors.length,
      criticalNodes,
      averageRisk,
      typeCounts,
      tierCounts,
      junctionCount: typeCounts.junction || 0
    };
  },

  async getCorridorsList(routesInput) {
    const routes = routesInput || await this.getRoutes();
    const allNodes = await railwayNodeRepository.findAll();
    const nodes = allNodes.map((node) => ({
      id: node.nodeCode,
      lat: node.latitude,
      lng: node.longitude,
      zone: node.region
    }));
    return this.buildCorridors(routes, nodes);
  },

  async getCorridors() {
    return this.getCorridorsList();
  },

  async getNodeConnections(nodeCode) {
    const node = await railwayNodeRepository.findByCode(nodeCode.toUpperCase());
    if (!node) {
      throw new Error(`Railway Node with code ${nodeCode} not found`);
    }

    const routes = await routeSegmentRepository.findByNodeId(node._id);

    const connections = await railwayConnectionRepository.findAll();
    const degreeMap = buildNodeDegreeMap(connections);

    const formattedRoutes = routes
      .map((route) => formatRoute(route, degreeMap))
      .filter(Boolean);

    const connectedNodeCodes = new Set();
    formattedRoutes.forEach((route) => {
      connectedNodeCodes.add(route.from);
      connectedNodeCodes.add(route.to);
    });
    connectedNodeCodes.delete(node.nodeCode);

    // Using railwayNodeRepository findAll and filtering manually to simulate IN query for brevity
    const allNodes = await railwayNodeRepository.findAll();
    const connectedNodes = allNodes.filter(n => connectedNodeCodes.has(n.nodeCode));

    const nodes = connectedNodes.map((n) => ({
      id: n.nodeCode,
      name: n.nodeName,
      type: normalizeNodeType(n.nodeType),
      zone: n.region,
      lat: n.latitude,
      lng: n.longitude,
      status: normalizeStatus(n.status),
      connectionCount: degreeMap[n.nodeCode] || 0
    }));

    return {
      nodeCode: node.nodeCode,
      nodeName: node.nodeName,
      routes: formattedRoutes,
      connections: formattedRoutes,
      connectedNodes: nodes,
      connectionCount: formattedRoutes.length
    };
  },

  /**
   * Group connected stations into topology clusters for pathfinding prep.
   */
  async getNetworkTopology() {
    return this.getTopology();
  }
};

export default routeService;
