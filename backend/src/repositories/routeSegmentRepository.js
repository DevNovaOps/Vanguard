import { getPool } from '../config/database.js';

const normalizeSegment = (row) => {
  if (!row) return null;
  const seg = {
    _id: String(row.id),
    routeCode: row.route_code,
    routeName: row.route_name,
    distance: Number(row.distance),
    coordinates: row.coordinates || [],
    status: row.status,
    region: row.region,
    tier: row.tier,
    corridorId: row.corridor_id,
    loadPct: Number(row.load_pct),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (row.source_code) {
    seg.sourceNode = { _id: String(row.source_node), nodeCode: row.source_code, nodeName: row.source_name };
  } else {
    seg.sourceNode = row.source_node ? String(row.source_node) : null;
  }
  if (row.target_code) {
    seg.targetNode = { _id: String(row.target_node), nodeCode: row.target_code, nodeName: row.target_name };
  } else {
    seg.targetNode = row.target_node ? String(row.target_node) : null;
  }
  return seg;
};

const POPULATED_SELECT = `
  rs.*,
  sn.node_code as source_code, sn.node_name as source_name,
  tn.node_code as target_code, tn.node_name as target_name
`;

const POPULATED_JOIN = `
  FROM route_segments rs
  LEFT JOIN railway_nodes sn ON rs.source_node = sn.id
  LEFT JOIN railway_nodes tn ON rs.target_node = tn.id
`;

const routeSegmentRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(`SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} ORDER BY rs.route_code`);
    return rows.map(normalizeSegment);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rs.id = ?`, [id]);
    return normalizeSegment(rows[0]);
  },

  async findByCode(routeCode) {
    const pool = getPool();
    const [rows] = await pool.execute(`SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rs.route_code = ?`, [routeCode]);
    return normalizeSegment(rows[0]);
  },

  async findByNodeId(nodeId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rs.source_node = ? OR rs.target_node = ?`,
      [nodeId, nodeId]
    );
    return rows.map(normalizeSegment);
  },

  async findByCorridorId(corridorId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rs.corridor_id = ?`,
      [corridorId]
    );
    return rows.map(normalizeSegment);
  },

  async getDistinctCorridors() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT corridor_id, COUNT(*) as segment_count, SUM(distance) as total_distance, region
       FROM route_segments
       WHERE corridor_id IS NOT NULL
       GROUP BY corridor_id, region`
    );
    return rows;
  },

  async create(data) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO route_segments (route_code, route_name, source_node, target_node, distance, coordinates, status, region, tier, corridor_id, load_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.routeCode, data.routeName, data.sourceNode, data.targetNode, data.distance,
        JSON.stringify(data.coordinates || []), data.status || 'Active', data.region,
        data.tier || 'local', data.corridorId || null, data.loadPct || 50
      ]
    );
    return this.findById(result.insertId);
  },

  async countAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM route_segments');
    return rows[0].cnt;
  }
};

export default routeSegmentRepository;
