import { getPool } from '../config/database.js';

const normalizeTransitNode = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    name: row.name,
    nodeCode: row.node_code,
    nodeType: row.node_type,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status,
    description: row.description,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const transitNodeRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM transit_nodes ORDER BY node_code ASC');
    return rows.map(normalizeTransitNode);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM transit_nodes WHERE id = ?', [id]);
    return normalizeTransitNode(rows[0]);
  },

  async findByCode(nodeCode) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM transit_nodes WHERE node_code = ?', [nodeCode]);
    return normalizeTransitNode(rows[0]);
  },

  async create(data) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO transit_nodes (name, node_code, node_type, latitude, longitude, status, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.nodeCode, data.nodeType, data.latitude, data.longitude,
       data.status || 'Active', data.description || null, data.createdBy]
    );
    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.nodeCode !== undefined) { fields.push('node_code = ?'); values.push(updates.nodeCode); }
    if (updates.nodeType !== undefined) { fields.push('node_type = ?'); values.push(updates.nodeType); }
    if (updates.latitude !== undefined) { fields.push('latitude = ?'); values.push(updates.latitude); }
    if (updates.longitude !== undefined) { fields.push('longitude = ?'); values.push(updates.longitude); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }

    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE transit_nodes SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async deleteById(id) {
    const pool = getPool();
    const node = await this.findById(id);
    if (!node) return null;
    await pool.execute('DELETE FROM transit_nodes WHERE id = ?', [id]);
    return node;
  },

  async countAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM transit_nodes');
    return rows[0].cnt;
  },

  async countByStatus(status) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM transit_nodes WHERE status = ?', [status]);
    return rows[0].cnt;
  }
};

export default transitNodeRepository;
