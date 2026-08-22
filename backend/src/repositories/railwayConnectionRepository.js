import { getPool } from '../config/database.js';

const normalizeConnection = (row) => {
  if (!row) return null;
  const conn = {
    _id: String(row.id),
    distance: Number(row.distance),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  // If joined with source/target node data
  if (row.source_id) {
    conn.sourceNode = {
      _id: String(row.source_id),
      nodeCode: row.source_code,
      nodeName: row.source_name,
      nodeType: row.source_type,
      latitude: Number(row.source_lat),
      longitude: Number(row.source_lng),
      status: row.source_status,
      region: row.source_region
    };
  } else {
    conn.sourceNode = row.source_node_id ? String(row.source_node_id) : null;
  }
  if (row.target_id) {
    conn.targetNode = {
      _id: String(row.target_id),
      nodeCode: row.target_code,
      nodeName: row.target_name,
      nodeType: row.target_type,
      latitude: Number(row.target_lat),
      longitude: Number(row.target_lng),
      status: row.target_status,
      region: row.target_region
    };
  } else {
    conn.targetNode = row.target_node_id ? String(row.target_node_id) : null;
  }
  return conn;
};

const POPULATED_SELECT = `
  rc.id, rc.source_node_id, rc.target_node_id, rc.distance, rc.status, rc.created_at, rc.updated_at,
  sn.id as source_id, sn.node_code as source_code, sn.node_name as source_name, sn.node_type as source_type,
  sn.latitude as source_lat, sn.longitude as source_lng, sn.status as source_status, sn.region as source_region,
  tn.id as target_id, tn.node_code as target_code, tn.node_name as target_name, tn.node_type as target_type,
  tn.latitude as target_lat, tn.longitude as target_lng, tn.status as target_status, tn.region as target_region
`;

const POPULATED_JOIN = `
  FROM railway_connections rc
  LEFT JOIN railway_nodes sn ON rc.source_node_id = sn.id
  LEFT JOIN railway_nodes tn ON rc.target_node_id = tn.id
`;

const railwayConnectionRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(`SELECT ${POPULATED_SELECT} ${POPULATED_JOIN}`);
    return rows.map(normalizeConnection);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(`SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rc.id = ?`, [id]);
    return normalizeConnection(rows[0]);
  },

  async findByNodes(sourceNodeId, targetNodeId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rc.source_node_id = ? AND rc.target_node_id = ?`,
      [sourceNodeId, targetNodeId]
    );
    return normalizeConnection(rows[0]);
  },

  async create({ sourceNode, targetNode, distance, status }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO railway_connections (source_node_id, target_node_id, distance, status)
       VALUES (?, ?, ?, ?)`,
      [sourceNode, targetNode, distance, status || 'Active']
    );
    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.sourceNode !== undefined) { fields.push('source_node_id = ?'); values.push(updates.sourceNode); }
    if (updates.targetNode !== undefined) { fields.push('target_node_id = ?'); values.push(updates.targetNode); }
    if (updates.distance !== undefined) { fields.push('distance = ?'); values.push(updates.distance); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE railway_connections SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async deleteById(id) {
    const pool = getPool();
    const conn = await this.findById(id);
    if (!conn) return null;
    await pool.execute('DELETE FROM railway_connections WHERE id = ?', [id]);
    return conn;
  },

  async deleteByNodeId(nodeId) {
    const pool = getPool();
    const [result] = await pool.execute(
      'DELETE FROM railway_connections WHERE source_node_id = ? OR target_node_id = ?',
      [nodeId, nodeId]
    );
    return { deletedCount: result.affectedRows };
  },

  async countAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM railway_connections');
    return rows[0].cnt;
  },

  async countByStatus(status) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM railway_connections WHERE status = ?', [status]);
    return rows[0].cnt;
  },

  async findByNodeId(nodeId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE rc.source_node_id = ? OR rc.target_node_id = ?`,
      [nodeId, nodeId]
    );
    return rows.map(normalizeConnection);
  }
};

export default railwayConnectionRepository;
