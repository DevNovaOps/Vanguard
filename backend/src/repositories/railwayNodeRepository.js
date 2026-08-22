import { getPool } from '../config/database.js';

const normalizeNode = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    nodeCode: row.node_code,
    nodeName: row.node_name,
    nodeType: row.node_type,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status,
    region: row.region,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const railwayNodeRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM railway_nodes ORDER BY node_code ASC');
    return rows.map(normalizeNode);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM railway_nodes WHERE id = ?', [id]);
    return normalizeNode(rows[0]);
  },

  async findByCode(nodeCode) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM railway_nodes WHERE node_code = ?', [nodeCode.toUpperCase()]);
    return normalizeNode(rows[0]);
  },

  async findByName(nodeName) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM railway_nodes WHERE node_name = ?', [nodeName]);
    return normalizeNode(rows[0]);
  },

  async findFirst() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM railway_nodes LIMIT 1');
    return normalizeNode(rows[0]);
  },

  async create({ nodeCode, nodeName, nodeType, latitude, longitude, status, region }) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO railway_nodes (node_code, node_name, node_type, latitude, longitude, status, region)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nodeCode.toUpperCase(), nodeName, nodeType, latitude, longitude, status || 'Active', region]
    );
    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.nodeCode !== undefined) { fields.push('node_code = ?'); values.push(updates.nodeCode.toUpperCase()); }
    if (updates.nodeName !== undefined) { fields.push('node_name = ?'); values.push(updates.nodeName); }
    if (updates.nodeType !== undefined) { fields.push('node_type = ?'); values.push(updates.nodeType); }
    if (updates.latitude !== undefined) { fields.push('latitude = ?'); values.push(updates.latitude); }
    if (updates.longitude !== undefined) { fields.push('longitude = ?'); values.push(updates.longitude); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.region !== undefined) { fields.push('region = ?'); values.push(updates.region); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE railway_nodes SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async deleteById(id) {
    const pool = getPool();
    const node = await this.findById(id);
    if (!node) return null;
    await pool.execute('DELETE FROM railway_nodes WHERE id = ?', [id]);
    return node;
  },

  async countAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM railway_nodes');
    return rows[0].cnt;
  },

  async countByStatus(status) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM railway_nodes WHERE status = ?', [status]);
    return rows[0].cnt;
  },

  async getRegionalBreakdown() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT
        region,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' OR status = 'healthy' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Maintenance' OR status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'Inactive' OR status = 'critical' THEN 1 ELSE 0 END) as inactive
      FROM railway_nodes
      GROUP BY region
      ORDER BY region ASC
    `);
    return rows;
  }
};

export default railwayNodeRepository;
