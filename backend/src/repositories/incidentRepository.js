import { getPool } from '../config/database.js';

const normalizeIncident = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    incidentId: row.incident_id,
    nodeId: row.node_id ? String(row.node_id) : null,
    riskScore: Number(row.risk_score),
    severity: row.severity,
    title: row.title,
    description: row.description,
    status: row.status,
    assignedTeam: row.assigned_team,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Populated node info if joined
    ...(row.node_code && {
      nodeId: {
        _id: String(row.node_id),
        nodeCode: row.node_code,
        nodeName: row.node_name,
        nodeType: row.node_type,
        region: row.node_region
      }
    })
  };
};

const INCIDENT_SELECT = `
  i.id, i.incident_id, i.node_id, i.risk_score, i.severity, i.title, i.description,
  i.status, i.assigned_team, i.source, i.created_at, i.updated_at
`;

const POPULATED_SELECT = `
  ${INCIDENT_SELECT},
  rn.node_code, rn.node_name, rn.node_type, rn.region as node_region
`;

const POPULATED_JOIN = `
  FROM incidents i
  LEFT JOIN railway_nodes rn ON i.node_id = rn.id
`;

const incidentRepository = {
  async findAll(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];

    if (filters.status) { conditions.push('i.status = ?'); values.push(filters.status); }
    if (filters.severity) { conditions.push('i.severity = ?'); values.push(filters.severity); }
    if (filters.nodeId) { conditions.push('i.node_id = ?'); values.push(filters.nodeId); }
    if (filters.source) { conditions.push('i.source = ?'); values.push(filters.source); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} ${where} ORDER BY i.created_at DESC`,
      values
    );
    return rows.map(normalizeIncident);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE i.id = ?`,
      [id]
    );
    return normalizeIncident(rows[0]);
  },

  async findByIncidentId(incidentId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE i.incident_id = ?`,
      [incidentId]
    );
    return normalizeIncident(rows[0]);
  },

  async findOpenByNodeId(nodeId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE i.node_id = ? AND i.status = 'Open'`,
      [nodeId]
    );
    return normalizeIncident(rows[0]);
  },

  async create({ nodeId, riskScore, severity, title, description, status, assignedTeam, source }) {
    const pool = getPool();

    // Generate sequential incident ID
    const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM incidents');
    const count = countResult[0].cnt + 1;
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const incidentId = `INC-${dateStr}-${randomPart}-${count}`;

    const [result] = await pool.execute(
      `INSERT INTO incidents (incident_id, node_id, risk_score, severity, title, description, status, assigned_team, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [incidentId, nodeId, riskScore, severity, title, description, status || 'Open', assignedTeam || null, source]
    );

    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.riskScore !== undefined) { fields.push('risk_score = ?'); values.push(updates.riskScore); }
    if (updates.severity !== undefined) { fields.push('severity = ?'); values.push(updates.severity); }
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.assignedTeam !== undefined) { fields.push('assigned_team = ?'); values.push(updates.assignedTeam); }
    if (updates.source !== undefined) { fields.push('source = ?'); values.push(updates.source); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async findOpen() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE i.status IN ('Open', 'Investigating', 'Mitigating') ORDER BY i.created_at DESC`
    );
    return rows.map(normalizeIncident);
  },

  async findCritical() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE i.severity = 'Critical' AND i.status != 'Closed' ORDER BY i.created_at DESC`
    );
    return rows.map(normalizeIncident);
  },

  async countAll() {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM incidents');
    return rows[0].cnt;
  },

  async countByFilter(conditions) {
    const pool = getPool();
    const clauses = [];
    const values = [];

    if (conditions.status) {
      if (Array.isArray(conditions.status)) {
        clauses.push(`status IN (${conditions.status.map(() => '?').join(',')})`);
        values.push(...conditions.status);
      } else {
        clauses.push('status = ?');
        values.push(conditions.status);
      }
    }
    if (conditions.severity) { clauses.push('severity = ?'); values.push(conditions.severity); }
    if (conditions.statusNot) { clauses.push('status != ?'); values.push(conditions.statusNot); }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.execute(`SELECT COUNT(*) as cnt FROM incidents ${where}`, values);
    return rows[0].cnt;
  },

  async findForPriority() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN}
       WHERE i.status IN ('Open', 'Investigating', 'Mitigating')
       ORDER BY i.risk_score DESC, i.created_at ASC`
    );
    return rows.map(normalizeIncident);
  },

  async getSeverityDistribution() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT severity, COUNT(*) as cnt FROM incidents GROUP BY severity
    `);
    const dist = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    rows.forEach(r => { dist[r.severity] = r.cnt; });
    return dist;
  }
};

export default incidentRepository;
