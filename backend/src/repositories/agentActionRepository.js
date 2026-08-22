import { getPool } from '../config/database.js';

const normalizeAction = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    telemetryData: row.telemetry_data || {},
    detectedThreat: row.detected_threat,
    severity: row.severity,
    decision: row.decision,
    confidence: Number(row.confidence),
    reasoning: row.reasoning,
    status: row.status,
    executedAt: row.executed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Populated node
    ...(row.node_code ? {
      nodeId: {
        _id: String(row.node_id),
        nodeCode: row.node_code,
        nodeName: row.node_name,
        nodeType: row.node_type,
        region: row.node_region
      }
    } : {
      nodeId: row.node_id ? String(row.node_id) : null
    }),
    incidentId: row.incident_id ? String(row.incident_id) : null
  };
};

const POPULATED_SELECT = `
  aa.*, rn.node_code, rn.node_name, rn.node_type, rn.region as node_region
`;

const POPULATED_JOIN = `
  FROM agent_actions aa
  LEFT JOIN railway_nodes rn ON aa.node_id = rn.id
`;

const agentActionRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} ORDER BY aa.created_at DESC`
    );
    return rows.map(normalizeAction);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE aa.id = ?`,
      [id]
    );
    return normalizeAction(rows[0]);
  },

  async create(data) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO agent_actions (node_id, incident_id, telemetry_data, detected_threat, severity, decision, confidence, reasoning, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nodeId, data.incidentId || null,
        JSON.stringify(data.telemetryData || {}),
        data.detectedThreat, data.severity, data.decision,
        data.confidence, data.reasoning, data.status || 'success'
      ]
    );
    return this.findById(result.insertId);
  },

  async getDashboardStats() {
    const pool = getPool();
    const [total] = await pool.execute('SELECT COUNT(*) as cnt FROM agent_actions');
    const [statusCounts] = await pool.execute('SELECT status, COUNT(*) as cnt FROM agent_actions GROUP BY status');

    const stats = { totalActions: total[0].cnt, success: 0, pending: 0, failed: 0 };
    statusCounts.forEach(r => { stats[r.status] = r.cnt; });

    const successRate = stats.totalActions > 0 ? Math.round((stats.success / stats.totalActions) * 100) : 0;

    const [avgConf] = await pool.execute('SELECT AVG(confidence) as avg_conf FROM agent_actions');
    const avgConfidence = Math.round((avgConf[0].avg_conf || 0) * 100) / 100;

    const [recentActions] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} ORDER BY aa.created_at DESC LIMIT 10`
    );

    return { ...stats, successRate, avgConfidence, recentActions: recentActions.map(normalizeAction) };
  },

  async findRecentByNodeId(nodeId, limit = 5) {
    const pool = getPool();
    const limitNum = Math.max(1, parseInt(limit, 10) || 5);
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT} ${POPULATED_JOIN} WHERE aa.node_id = ? ORDER BY aa.created_at DESC LIMIT ${limitNum}`,
      [nodeId]
    );
    return rows.map(normalizeAction);
  }
};

export default agentActionRepository;
