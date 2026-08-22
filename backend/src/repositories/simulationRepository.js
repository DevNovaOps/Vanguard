import { getPool } from '../config/database.js';

const normalizeRun = (row) => {
  if (!row) return null;
  let parsedResult = row.result;
  if (typeof parsedResult === 'string') {
    try { parsedResult = JSON.parse(parsedResult); } catch (e) {}
  }
  return {
    _id: String(row.id),
    runId: row.run_id,
    status: row.status,
    triggeredBy: row.triggered_by ? String(row.triggered_by) : null,
    nodeId: row.node_name ? {
      _id: String(row.node_id),
      nodeCode: row.node_code,
      nodeName: row.node_name,
      nodeType: row.node_type,
      status: row.node_status,
      region: row.node_region
    } : (row.node_id ? String(row.node_id) : null),
    totalSteps: row.total_steps,
    completedSteps: row.completed_steps,
    currentStep: row.current_step,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    result: parsedResult || null,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const normalizeResult = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    simulationId: row.simulation_id,
    asset_id: row.asset_id,
    asset_type: row.asset_type,
    location: row.location,
    failure_type: row.failure_type,
    query: row.query,
    retrieval_results: row.retrieval_results,
    sensor_evidence: row.sensor_evidence,
    historical_incidents: row.historical_incidents,
    rdso_guidance: row.rdso_guidance,
    root_causes: row.root_causes,
    mitigation_actions: row.mitigation_actions,
    executive_summary: row.executive_summary,
    risk_level: row.risk_level,
    resultCreatedAt: row.result_created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const normalizeEvent = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    runId: row.run_id ? String(row.run_id) : null,
    stepNumber: row.step_number,
    stepName: row.step_name,
    module: row.module,
    status: row.status,
    description: row.description,
    data: row.data || null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    duration: row.duration,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const POPULATED_RUN_SELECT = `
  sr.*, rn.node_code, rn.node_name, rn.node_type, rn.status as node_status, rn.region as node_region
`;

const simulationRepository = {
  // ─── Simulation Runs ─────────────────────────────────────────────────
  async createRun(data) {
    const pool = getPool();
    const runId = `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [result] = await pool.execute(
      `INSERT INTO simulation_runs (run_id, status, triggered_by, node_id, total_steps, completed_steps, current_step, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [runId, data.status || 'Running', data.triggeredBy || null, data.nodeId || null,
       data.totalSteps || 7, data.completedSteps || 0, data.currentStep || 0]
    );
    return this.findRunById(result.insertId);
  },

  async findRunById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_RUN_SELECT}
       FROM simulation_runs sr
       LEFT JOIN railway_nodes rn ON sr.node_id = rn.id
       WHERE sr.id = ?`,
      [id]
    );
    return normalizeRun(rows[0]);
  },

  async findRunByRunId(runId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_RUN_SELECT}
       FROM simulation_runs sr
       LEFT JOIN railway_nodes rn ON sr.node_id = rn.id
       WHERE sr.run_id = ?`,
      [runId]
    );
    return normalizeRun(rows[0]);
  },

  async updateRun(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.completedSteps !== undefined) { fields.push('completed_steps = ?'); values.push(updates.completedSteps); }
    if (updates.currentStep !== undefined) { fields.push('current_step = ?'); values.push(updates.currentStep); }
    if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(updates.completedAt); }
    if (updates.result !== undefined) { fields.push('result = ?'); values.push(JSON.stringify(updates.result)); }
    if (updates.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(updates.errorMessage); }

    if (fields.length === 0) return this.findRunById(id);
    values.push(id);
    await pool.execute(`UPDATE simulation_runs SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findRunById(id);
  },

  async getRunHistory(limit = 50) {
    const pool = getPool();
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const [rows] = await pool.execute(
      `SELECT ${POPULATED_RUN_SELECT}
       FROM simulation_runs sr
       LEFT JOIN railway_nodes rn ON sr.node_id = rn.id
       ORDER BY sr.created_at DESC LIMIT ${limitNum}`
    );
    return rows.map(normalizeRun);
  },

  async getRunStats() {
    const pool = getPool();
    const [total] = await pool.execute('SELECT COUNT(*) as cnt FROM simulation_runs');
    const [statusCounts] = await pool.execute('SELECT status, COUNT(*) as cnt FROM simulation_runs GROUP BY status');

    const stats = { total: total[0].cnt, running: 0, completed: 0, failed: 0, cancelled: 0 };
    statusCounts.forEach(r => { stats[r.status.toLowerCase()] = r.cnt; });

    return stats;
  },

  // ─── Simulation Results ──────────────────────────────────────────────
  async createResult(data) {
    const pool = getPool();
    const simulationId = `SIMR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [result] = await pool.execute(
      `INSERT INTO simulation_results (simulation_id, asset_id, asset_type, location, failure_type, \`query\`, retrieval_results, sensor_evidence, historical_incidents, rdso_guidance, root_causes, mitigation_actions, executive_summary, risk_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        simulationId, data.asset_id, data.asset_type, data.location, data.failure_type,
        data.query, data.retrieval_results || '', data.sensor_evidence || '',
        data.historical_incidents || '', data.rdso_guidance || '', data.root_causes || '',
        data.mitigation_actions || '', data.executive_summary || '', data.risk_level || 'LOW'
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM simulation_results WHERE id = ?', [result.insertId]);
    return normalizeResult(rows[0]);
  },

  // ─── Simulation Events ──────────────────────────────────────────────
  async createEvent(data) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO simulation_events (run_id, step_number, step_name, module, status, description, data, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [data.runId, data.stepNumber, data.stepName, data.module, data.status || 'pending',
       data.description || '', data.data ? JSON.stringify(data.data) : null]
    );

    const [rows] = await pool.execute('SELECT * FROM simulation_events WHERE id = ?', [result.insertId]);
    return normalizeEvent(rows[0]);
  },

  async updateEvent(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(updates.completedAt); }
    if (updates.duration !== undefined) { fields.push('duration = ?'); values.push(updates.duration); }
    if (updates.data !== undefined) { fields.push('data = ?'); values.push(JSON.stringify(updates.data)); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }

    if (fields.length === 0) return;
    values.push(id);
    await pool.execute(`UPDATE simulation_events SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async getEventsByRunId(runId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT DISTINCT se.*
       FROM simulation_events se
       LEFT JOIN simulation_runs sr ON se.run_id = sr.id OR se.run_id = sr.run_id
       WHERE sr.run_id = ? OR sr.id = ? OR se.run_id = ?
       ORDER BY se.step_number ASC`,
      [runId, runId, runId]
    );
    return rows.map(normalizeEvent);
  }
};

export default simulationRepository;
