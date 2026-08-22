import { getPool } from '../config/database.js';

const normalizeRiskScore = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    nodeId: row.node_id ? String(row.node_id) : null,
    thermalRisk: Number(row.thermal_risk),
    electricalRisk: Number(row.electrical_risk),
    structuralRisk: Number(row.structural_risk),
    mechanicalRisk: Number(row.mechanical_risk),
    signalingRisk: Number(row.signaling_risk),
    totalRisk: Number(row.total_risk),
    riskLevel: row.risk_level,
    calculatedAt: row.calculated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Populated node info
    ...(row.node_code && {
      nodeId: {
        _id: String(row.node_id),
        nodeCode: row.node_code,
        nodeName: row.node_name,
        nodeType: row.node_type,
        status: row.node_status,
        region: row.node_region
      }
    })
  };
};

const POPULATED_SELECT = `
  rs.*, rn.node_code, rn.node_name, rn.node_type, rn.status as node_status, rn.region as node_region
`;

const riskScoreRepository = {
  async findAll() {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT}
       FROM risk_scores rs
       LEFT JOIN railway_nodes rn ON rs.node_id = rn.id
       ORDER BY rs.total_risk DESC`
    );
    return rows.map(normalizeRiskScore);
  },

  async findByNodeId(nodeId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT}
       FROM risk_scores rs
       LEFT JOIN railway_nodes rn ON rs.node_id = rn.id
       WHERE rs.node_id = ?`,
      [nodeId]
    );
    return normalizeRiskScore(rows[0]);
  },

  async upsert(nodeId, data) {
    const pool = getPool();
    const riskLevel = data.totalRisk >= 80 ? 'Critical' : data.totalRisk >= 60 ? 'High' : data.totalRisk >= 30 ? 'Medium' : 'Low';

    await pool.execute(
      `INSERT INTO risk_scores (node_id, thermal_risk, electrical_risk, structural_risk, mechanical_risk, signaling_risk, total_risk, risk_level, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         thermal_risk = VALUES(thermal_risk),
         electrical_risk = VALUES(electrical_risk),
         structural_risk = VALUES(structural_risk),
         mechanical_risk = VALUES(mechanical_risk),
         signaling_risk = VALUES(signaling_risk),
         total_risk = VALUES(total_risk),
         risk_level = VALUES(risk_level),
         calculated_at = NOW()`,
      [nodeId, data.thermalRisk || 0, data.electricalRisk || 0, data.structuralRisk || 0,
       data.mechanicalRisk || 0, data.signalingRisk || 0, data.totalRisk || 0, riskLevel]
    );

    return this.findByNodeId(nodeId);
  },

  async create(data) {
    const nodeId = data.nodeId || data.node_id;
    return this.upsert(nodeId, data);
  },

  async update(id, data) {
    const nodeId = data.nodeId || data.node_id || id;
    return this.upsert(nodeId, data);
  },

  async getDashboardStats() {
    const pool = getPool();

    const [totalResult] = await pool.execute('SELECT COUNT(*) as cnt FROM risk_scores');
    const [distribution] = await pool.execute('SELECT risk_level, COUNT(*) as cnt FROM risk_scores GROUP BY risk_level');
    const dist = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    distribution.forEach(r => { dist[r.risk_level] = r.cnt; });

    const [avgResult] = await pool.execute('SELECT AVG(total_risk) as avg_risk FROM risk_scores');
    const [maxRows] = await pool.execute(
      `SELECT ${POPULATED_SELECT}
       FROM risk_scores rs
       LEFT JOIN railway_nodes rn ON rs.node_id = rn.id
       ORDER BY rs.total_risk DESC LIMIT 1`
    );
    const highestRiskNode = maxRows.length > 0 ? normalizeRiskScore(maxRows[0]) : null;

    return {
      totalNodes: totalResult[0].cnt,
      distribution: dist,
      averageRisk: Math.round((avgResult[0].avg_risk || 0) * 100) / 100,
      highestRiskNode
    };
  },

  async getTopRiskAssets(limit = 10) {
    const pool = getPool();
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_SELECT}
       FROM risk_scores rs
       LEFT JOIN railway_nodes rn ON rs.node_id = rn.id
       ORDER BY rs.total_risk DESC
       LIMIT ${limitNum}`
    );
    return rows.map(normalizeRiskScore);
  }
};

export default riskScoreRepository;
