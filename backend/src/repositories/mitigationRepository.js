import { getPool } from '../config/database.js';

const normalizeMitigation = (row) => {
  if (!row) return null;
  const m = {
    _id: String(row.id),
    mitigationId: row.mitigation_id,
    action: row.action,
    type: row.type,
    severity: row.severity,
    status: row.status,
    executionSource: row.execution_source,
    executionNotes: row.execution_notes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    executedAt: row.executed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  // Populated incident
  if (row.incident_id_str) {
    m.incidentId = { _id: String(row.incident_id), incidentId: row.incident_id_str };
  } else {
    m.incidentId = row.incident_id ? String(row.incident_id) : null;
  }
  // Populated node
  if (row.node_code) {
    m.nodeId = { _id: String(row.node_id), nodeCode: row.node_code, nodeName: row.node_name };
  } else {
    m.nodeId = row.node_id ? String(row.node_id) : null;
  }
  // Populated user
  if (row.user_name) {
    m.executedBy = { _id: String(row.executed_by), name: row.user_name, email: row.user_email };
  } else {
    m.executedBy = row.executed_by ? String(row.executed_by) : null;
  }
  m.agentActionId = row.agent_action_id ? String(row.agent_action_id) : null;
  return m;
};

const POPULATED_SELECT = `
  m.*,
  inc.incident_id as incident_id_str,
  rn.node_code, rn.node_name,
  u.name as user_name, u.email as user_email
`;

const POPULATED_JOIN = `
  FROM mitigations m
  LEFT JOIN incidents inc ON m.incident_id = inc.id
  LEFT JOIN railway_nodes rn ON m.node_id = rn.id
  LEFT JOIN users u ON m.executed_by = u.id
`;

const mitigationRepository = {
  async findAll(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];

    if (filters.status) { conditions.push('m.status = ?'); values.push(filters.status); }
    if (filters.severity) { conditions.push('m.severity = ?'); values.push(filters.severity); }
    if (filters.nodeId) { conditions.push('m.node_id = ?'); values.push(filters.nodeId); }
    if (filters.executionSource) { conditions.push('m.execution_source = ?'); values.push(filters.executionSource); }
    if (filters.action) { conditions.push('m.action = ?'); values.push(filters.action); }
    if (filters.type) { conditions.push('m.type = ?'); values.push(filters.type); }
    if (filters.incidentId) { conditions.push('m.incident_id = ?'); values.push(filters.incidentId); }
    if (filters.search) {
      conditions.push('(m.action LIKE ? OR m.execution_notes LIKE ? OR rn.node_name LIKE ?)');
      values.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} ${where} ORDER BY m.created_at DESC`,
      values
    );
    return rows.map(normalizeMitigation);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE m.id = ?`,
      [id]
    );
    return normalizeMitigation(rows[0]);
  },

  async findByMitigationId(mitigationId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE m.mitigation_id = ?`,
      [mitigationId]
    );
    return normalizeMitigation(rows[0]);
  },

  async create(data) {
    const pool = getPool();

    // Generate mitigation ID
    const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM mitigations');
    const count = countResult[0].cnt + 1;
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const mitigationId = `MIT-${dateStr}-${String(count).padStart(4, '0')}`;

    const [result] = await pool.execute(
      `INSERT INTO mitigations (mitigation_id, incident_id, node_id, action, type, severity, status, executed_by, execution_source, execution_notes, agent_action_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mitigationId, data.incidentId, data.nodeId, data.action, data.type, data.severity,
        data.status || 'Pending', data.executedBy || null, data.executionSource,
        data.executionNotes || '', data.agentActionId || null
      ]
    );

    return this.findById(result.insertId);
  },

  async update(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.executionNotes !== undefined) { fields.push('execution_notes = ?'); values.push(updates.executionNotes); }
    if (updates.executedBy !== undefined) { fields.push('executed_by = ?'); values.push(updates.executedBy); }
    if (updates.startedAt !== undefined) { fields.push('started_at = ?'); values.push(updates.startedAt); }
    if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(updates.completedAt); }
    if (updates.executedAt !== undefined) { fields.push('executed_at = ?'); values.push(updates.executedAt); }

    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE mitigations SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async getDashboardStats() {
    const pool = getPool();
    const [total] = await pool.execute('SELECT COUNT(*) as cnt FROM mitigations');
    const [statusCounts] = await pool.execute('SELECT status, COUNT(*) as cnt FROM mitigations GROUP BY status');

    const stats = { total: total[0].cnt, pending: 0, inProgress: 0, completed: 0, failed: 0, executed: 0, cancelled: 0 };
    statusCounts.forEach(r => {
      const key = r.status.charAt(0).toLowerCase() + r.status.slice(1);
      stats[key] = r.cnt;
    });

    const [severityCounts] = await pool.execute('SELECT severity, COUNT(*) as cnt FROM mitigations GROUP BY severity');
    const bySeverity = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    severityCounts.forEach(r => { bySeverity[r.severity] = r.cnt; });

    const totalMitigations = total[0].cnt;
    const completedActions = (stats.completed || 0) + (stats.executed || 0);
    const pendingActions = stats.pending || 0;
    const activeActions = (stats.inProgress || 0) + (stats.pending || 0);

    const [sourceCounts] = await pool.execute('SELECT execution_source, COUNT(*) as cnt FROM mitigations GROUP BY execution_source');

    return {
      ...stats,
      total: totalMitigations,
      totalMitigations,
      completedActions,
      pendingActions,
      activeActions,
      bySeverity,
      bySource: sourceCounts
    };
  }
};

export default mitigationRepository;
