/**
 * Procedural Indian Railway network seed generator.
 * Produces 1200+ nodes and 4000+ connections across major corridors.
 */

const REGIONS = [
  'Northern', 'North Western', 'Western', 'Central', 'Eastern',
  'South Eastern', 'South Central', 'Southern', 'East Coast', 'North East'
];

const STATUSES = ['healthy', 'healthy', 'healthy', 'healthy', 'warning', 'critical', 'maintenance'];

const CORRIDORS = [
  {
    code: 'WR-DLI-MMCT',
    name: 'Delhi–Mumbai Western Main Line',
    region: 'Western',
    waypoints: [
      [28.6613, 77.2299, 'Delhi Junction', true],
      [28.4682, 77.0195, 'Gurugram', false],
      [26.9196, 75.7878, 'Jaipur Junction', true],
      [26.4561, 74.6295, 'Ajmer Junction', true],
      [25.7335, 73.6146, 'Marwar Junction', true],
      [24.1728, 72.4226, 'Palanpur Junction', true],
      [23.6022, 72.3995, 'Mahesana Junction', true],
      [23.0276, 72.6002, 'Ahmedabad Junction', true],
      [22.3129, 73.1812, 'Vadodara Junction', true],
      [21.7051, 72.9941, 'Bharuch Junction', true],
      [21.2044, 72.8406, 'Surat', true],
      [20.3752, 72.9132, 'Vapi', false],
      [18.9712, 72.8194, 'Mumbai Central', true]
    ]
  },
  {
    code: 'ER-DLI-HWH',
    name: 'Delhi–Howrah Grand Trunk Route',
    region: 'Eastern',
    waypoints: [
      [28.6613, 77.2299, 'Delhi Junction', true],
      [27.1767, 78.0081, 'Agra Cantt', true],
      [26.4499, 80.3319, 'Kanpur Central', true],
      [25.4484, 81.8333, 'Prayagraj Junction', true],
      [25.5941, 85.1376, 'Patna Junction', true],
      [25.2425, 86.9842, 'Mokama Junction', true],
      [22.5804, 88.3639, 'Howrah Junction', true]
    ]
  },
  {
    code: 'CR-DLI-CSTM',
    name: 'Delhi–Mumbai Central Route',
    region: 'Central',
    waypoints: [
      [28.6613, 77.2299, 'Delhi Junction', true],
      [28.9845, 77.7064, 'Meerut City', false],
      [27.8974, 78.0880, 'Aligarh Junction', true],
      [26.8467, 80.9462, 'Lucknow NR', true],
      [26.2183, 78.1828, 'Gwalior Junction', true],
      [23.2599, 77.4126, 'Bhopal Junction', true],
      [21.1458, 79.0882, 'Nagpur Junction', true],
      [19.9975, 73.7898, 'Nasik Road', true],
      [18.9712, 72.8194, 'Mumbai Central', true]
    ]
  },
  {
    code: 'SR-MAS-SBC',
    name: 'Chennai–Bangalore Main Line',
    region: 'Southern',
    waypoints: [
      [13.0827, 80.2707, 'Chennai Central', true],
      [12.9716, 79.1580, 'Arakkonam Junction', true],
      [12.5266, 78.2150, 'Jolarpettai Junction', true],
      [12.9698, 77.7500, 'Bangalore City', true]
    ]
  },
  {
    code: 'SCR-HYD-SBC',
    name: 'Hyderabad–Bangalore Route',
    region: 'South Central',
    waypoints: [
      [17.3850, 78.4867, 'Secunderabad Junction', true],
      [16.5062, 80.6480, 'Vijayawada Junction', true],
      [15.8281, 78.0373, 'Guntakal Junction', true],
      [14.6826, 77.6006, 'Dharmavaram Junction', true],
      [12.9698, 77.7500, 'Bangalore City', true]
    ]
  },
  {
    code: 'ECoR-HWH-MAS',
    name: 'Howrah–Chennai Coromandel Route',
    region: 'East Coast',
    waypoints: [
      [22.5804, 88.3639, 'Howrah Junction', true],
      [20.2961, 85.8245, 'Bhubaneswar', true],
      [17.6868, 83.2185, 'Visakhapatnam Junction', true],
      [16.3067, 80.4365, 'Vijayawada Junction', true],
      [13.6288, 79.4192, 'Renigunta Junction', true],
      [13.0827, 80.2707, 'Chennai Central', true]
    ]
  },
  {
    code: 'NR-DLI-ASR',
    name: 'Delhi–Amritsar Main Line',
    region: 'Northern',
    waypoints: [
      [28.6613, 77.2299, 'Delhi Junction', true],
      [29.3919, 76.9635, 'Panipat Junction', true],
      [29.9695, 76.8783, 'Ambala Cantt Junction', true],
      [30.9010, 75.8573, 'Ludhiana Junction', true],
      [31.6340, 74.8723, 'Amritsar Junction', true]
    ]
  },
  {
    code: 'WR-AHM-RJT',
    name: 'Ahmedabad–Rajkot Route',
    region: 'Western',
    waypoints: [
      [23.0276, 72.6002, 'Ahmedabad Junction', true],
      [22.3039, 70.8022, 'Rajkot Junction', true],
      [21.7645, 72.1519, 'Jamnagar', true]
    ]
  },
  {
    code: 'NFR-GHY-DIB',
    name: 'Guwahati–Dibrugarh Route',
    region: 'North East',
    waypoints: [
      [26.1445, 91.7362, 'Guwahati', true],
      [26.7500, 94.2167, 'Dibrugarh', true],
      [27.4728, 94.9110, 'Tinsukia Junction', true]
    ]
  },
  {
    code: 'SER-HWH-ROU',
    name: 'Howrah–Rourkela Route',
    region: 'South Eastern',
    waypoints: [
      [22.5804, 88.3639, 'Howrah Junction', true],
      [22.3039, 87.3215, 'Kharagpur Junction', true],
      [22.2492, 84.8060, 'Rourkela', true]
    ]
  }
];

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const lerp = (a, b, t) => a + (b - a) * t;

const pickStatus = () => STATUSES[Math.floor(Math.random() * STATUSES.length)];

const pickSecondaryType = () => {
  const roll = Math.random();
  if (roll < 0.04) return 'Depot';
  if (roll < 0.07) return 'PowerHub';
  if (roll < 0.10) return 'SignalTower';
  return 'Station';
};

export const generateIndianRailwayNetwork = () => {
  const nodes = [];
  const nodeByKey = new Map();
  const connections = [];
  const connectionKeys = new Set();
  let nodeCounter = 0;

  const makeNodeCode = (prefix, index) =>
    `${prefix}${String(index).padStart(3, '0')}`.slice(0, 8).toUpperCase();

  const addNode = (lat, lng, name, nodeType, region, prefix) => {
    const key = `${lat.toFixed(2)}_${lng.toFixed(2)}_${name.slice(0, 12)}`;
    if (nodeByKey.has(key)) return nodeByKey.get(key);

    nodeCounter += 1;
    const node = {
      nodeCode: makeNodeCode(prefix, nodeCounter),
      nodeName: name,
      nodeType,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      status: pickStatus(),
      region
    };
    nodes.push(node);
    nodeByKey.set(key, node);
    return node;
  };

  const addConnection = (source, target) => {
    if (!source || !target || source.nodeCode === target.nodeCode) return false;
    const key = [source.nodeCode, target.nodeCode].sort().join('|');
    if (connectionKeys.has(key)) return false;
    connectionKeys.add(key);

    connections.push({
      sourceCode: source.nodeCode,
      targetCode: target.nodeCode,
      distance: parseFloat(
        Math.max(
          haversineKm(source.latitude, source.longitude, target.latitude, target.longitude),
          1
        ).toFixed(1)
      ),
      status: Math.random() < 0.92 ? 'Active' : (Math.random() < 0.5 ? 'warning' : 'Maintenance')
    });
    return true;
  };

  CORRIDORS.forEach((corridor) => {
    const corridorNodes = [];

    for (let i = 0; i < corridor.waypoints.length - 1; i += 1) {
      const [lat1, lng1, name1, isJunction1] = corridor.waypoints[i];
      const [lat2, lng2, name2, isJunction2] = corridor.waypoints[i + 1];
      const segmentDist = haversineKm(lat1, lng1, lat2, lng2);
      const stationCount = Math.max(8, Math.floor(segmentDist / 8));

      const startNode = addNode(
        lat1, lng1, name1,
        isJunction1 ? 'Junction' : 'Station',
        corridor.region,
        corridor.code.slice(0, 3)
      );
      corridorNodes.push(startNode);

      for (let s = 1; s < stationCount; s += 1) {
        const t = s / stationCount;
        const lat = lerp(lat1, lat2, t) + (Math.random() - 0.5) * 0.06;
        const lng = lerp(lng1, lng2, t) + (Math.random() - 0.5) * 0.06;
        const isMidJunction = s % 6 === 0 && Math.random() < 0.3;
        corridorNodes.push(addNode(
          lat, lng,
          `${corridor.region} Halt ${nodeCounter}`,
          isMidJunction ? 'Junction' : pickSecondaryType(),
          corridor.region,
          corridor.code.slice(0, 3)
        ));
      }

      corridorNodes.push(addNode(
        lat2, lng2, name2,
        isJunction2 ? 'Junction' : 'Station',
        corridor.region,
        corridor.code.slice(0, 3)
      ));
    }

    for (let i = 0; i < corridorNodes.length - 1; i += 1) {
      addConnection(corridorNodes[i], corridorNodes[i + 1]);
    }
  });

  const junctionNodes = nodes.filter((n) => n.nodeType === 'Junction');

  junctionNodes.forEach((j1, idx) => {
    for (let j = idx + 1; j < Math.min(junctionNodes.length, idx + 12); j += 1) {
      const j2 = junctionNodes[j];
      const dist = haversineKm(j1.latitude, j1.longitude, j2.latitude, j2.longitude);
      if (dist < 20 && j1.region !== j2.region) addConnection(j1, j2);
    }
  });

  junctionNodes.filter(() => Math.random() < 0.25).forEach((junction) => {
    const branchLen = 5 + Math.floor(Math.random() * 6);
    let prev = junction;
    const angle = Math.random() * Math.PI * 2;

    for (let b = 0; b < branchLen; b += 1) {
      const lat = prev.latitude + Math.sin(angle + b * 0.25) * 0.3;
      const lng = prev.longitude + Math.cos(angle + b * 0.25) * 0.3;
      const branchNode = addNode(
        lat, lng,
        `${junction.nodeName} Branch ${b + 1}`,
        b === branchLen - 1 && Math.random() < 0.2 ? 'Depot' : 'Station',
        junction.region,
        'BRN'
      );
      addConnection(prev, branchNode);
      prev = branchNode;
    }
  });

  while (nodes.length < 1250) {
    const anchor = nodes[Math.floor(Math.random() * nodes.length)];
    const lat = anchor.latitude + (Math.random() - 0.5) * 0.4;
    const lng = anchor.longitude + (Math.random() - 0.5) * 0.4;
    const satellite = addNode(
      lat, lng,
      `${anchor.region} Satellite ${nodeCounter}`,
      pickSecondaryType(),
      anchor.region,
      'SAT'
    );
    addConnection(satellite, anchor);

    for (let k = 0; k < 2; k += 1) {
      const neighbor = nodes[Math.floor(Math.random() * nodes.length)];
      if (neighbor.nodeCode !== satellite.nodeCode) {
        const dist = haversineKm(satellite.latitude, satellite.longitude, neighbor.latitude, neighbor.longitude);
        if (dist < 30) addConnection(satellite, neighbor);
      }
    }
  }

  // Build spatial mesh: connect each node to nearby peers for realistic network density
  const grid = new Map();
  const cellSize = 0.35;
  nodes.forEach((node) => {
    const gx = Math.floor(node.latitude / cellSize);
    const gy = Math.floor(node.longitude / cellSize);
    const key = `${gx}:${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(node);
  });

  nodes.forEach((node) => {
    const gx = Math.floor(node.latitude / cellSize);
    const gy = Math.floor(node.longitude / cellSize);
    const candidates = [];

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const bucket = grid.get(`${gx + dx}:${gy + dy}`);
        if (bucket) candidates.push(...bucket);
      }
    }

    candidates
      .filter((c) => c.nodeCode !== node.nodeCode)
      .map((c) => ({
        node: c,
        dist: haversineKm(node.latitude, node.longitude, c.latitude, c.longitude)
      }))
      .filter(({ dist }) => dist < 28)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 7)
      .forEach(({ node: peer }) => addConnection(node, peer));
  });

  let attempts = 0;
  while (connections.length < 4100 && attempts < 80000) {
    attempts += 1;
    const a = nodes[Math.floor(Math.random() * nodes.length)];
    const b = nodes[Math.floor(Math.random() * nodes.length)];
    if (a.nodeCode === b.nodeCode) continue;
    const dist = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    if (dist < 40) addConnection(a, b);
  }

  console.log(`[RAILWAY-SEED] Generated ${nodes.length} nodes and ${connections.length} connections.`);
  return { nodes, connections };
};

export default generateIndianRailwayNetwork;
