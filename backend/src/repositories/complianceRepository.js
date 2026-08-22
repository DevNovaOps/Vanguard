import { getPool } from '../config/database.js';

const normalizeRule = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    ruleCode: row.rule_code,
    standard: row.standard,
    sensorType: row.sensor_type,
    minValue: row.min_value !== null ? Number(row.min_value) : null,
    maxValue: row.max_value !== null ? Number(row.max_value) : null,
    severity: row.severity,
    description: row.description,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const normalizeViolation = (row) => {
  if (!row) return null;
  const v = {
    _id: String(row.id),
    sensorType: row.sensor_type,
    actualValue: Number(row.actual_value),
    expectedValue: Number(row.expected_value),
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  // Populated rule
  if (row.rule_code) {
    v.ruleId = {
      _id: String(row.rule_id),
      ruleCode: row.rule_code,
      standard: row.rule_standard,
      sensorType: row.rule_sensor_type
    };
  } else {
    v.ruleId = row.rule_id ? String(row.rule_id) : null;
  }
  // Populated node
  if (row.node_code) {
    v.nodeId = {
      _id: String(row.node_id),
      nodeCode: row.node_code,
      nodeName: row.node_name,
      region: row.node_region
    };
  } else {
    v.nodeId = row.node_id ? String(row.node_id) : null;
  }
  return v;
};

const complianceRepository = {
  // ─── Rules ───────────────────────────────────────────────────────────
  async findAllRules(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];
    const { page = 1, limit = 50, search, sensorType, severity, isActive, standard, sortBy = 'created_at', sortOrder = 'DESC' } = filters;

    if (search) { conditions.push('(rule_code LIKE ? OR description LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
    if (sensorType) { conditions.push('sensor_type = ?'); values.push(sensorType); }
    if (severity) { conditions.push('severity = ?'); values.push(severity); }
    if (isActive !== undefined && isActive !== '') { conditions.push('is_active = ?'); values.push(isActive === 'true' || isActive === true ? 1 : 0); }
    if (standard) { conditions.push('standard = ?'); values.push(standard); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortBy = ['rule_code', 'standard', 'severity', 'created_at', 'sensor_type'].includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const [countResult] = await pool.execute(`SELECT COUNT(*) as cnt FROM compliance_rules ${where}`, values);
    const total = countResult[0].cnt;

    const [rows] = await pool.execute(
      `SELECT * FROM compliance_rules ${where} ORDER BY ${validSortBy} ${validSortOrder} LIMIT ${limitNum} OFFSET ${offsetNum}`,
      values
    );

    return {
      rules: rows.map(normalizeRule),
      pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / parseInt(limit, 10)) }
    };
  },

  async findRuleById(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM compliance_rules WHERE id = ?', [id]);
    return normalizeRule(rows[0]);
  },

  async findRuleByCode(ruleCode) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM compliance_rules WHERE rule_code = ?', [ruleCode]);
    return normalizeRule(rows[0]);
  },

  async createRule(data) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO compliance_rules (rule_code, standard, sensor_type, min_value, max_value, severity, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.ruleCode, data.standard, data.sensorType, data.minValue ?? null, data.maxValue ?? null,
       data.severity, data.description || null, data.isActive !== false ? 1 : 0]
    );
    return this.findRuleById(result.insertId);
  },

  async updateRule(id, updates) {
    const pool = getPool();
    const fields = [];
    const values = [];

    if (updates.ruleCode !== undefined) { fields.push('rule_code = ?'); values.push(updates.ruleCode); }
    if (updates.standard !== undefined) { fields.push('standard = ?'); values.push(updates.standard); }
    if (updates.sensorType !== undefined) { fields.push('sensor_type = ?'); values.push(updates.sensorType); }
    if (updates.minValue !== undefined) { fields.push('min_value = ?'); values.push(updates.minValue); }
    if (updates.maxValue !== undefined) { fields.push('max_value = ?'); values.push(updates.maxValue); }
    if (updates.severity !== undefined) { fields.push('severity = ?'); values.push(updates.severity); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

    if (fields.length === 0) return this.findRuleById(id);
    values.push(id);
    await pool.execute(`UPDATE compliance_rules SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findRuleById(id);
  },

  async softDeleteRule(id) {
    const pool = getPool();
    await pool.execute('UPDATE compliance_rules SET is_active = 0 WHERE id = ?', [id]);
    return this.findRuleById(id);
  },

  // ─── Violations ──────────────────────────────────────────────────────
  async findAllViolations(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];
    const { page = 1, limit = 50, status, severity, sensorType, nodeId, ruleId, sortBy = 'cv.created_at', sortOrder = 'DESC' } = filters;

    if (status) { conditions.push('cv.status = ?'); values.push(status); }
    if (severity) { conditions.push('cv.severity = ?'); values.push(severity); }
    if (sensorType) { conditions.push('cv.sensor_type = ?'); values.push(sensorType); }
    if (nodeId) { conditions.push('cv.node_id = ?'); values.push(nodeId); }
    if (ruleId) { conditions.push('cv.rule_id = ?'); values.push(ruleId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortBy = ['cv.created_at', 'cv.severity', 'cv.status'].includes(sortBy) ? sortBy : 'cv.created_at';
    const validSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const joinSql = `
      FROM compliance_violations cv
      LEFT JOIN compliance_rules cr ON cv.rule_id = cr.id
      LEFT JOIN railway_nodes rn ON cv.node_id = rn.id
    `;

    const [countResult] = await pool.execute(`SELECT COUNT(*) as cnt ${joinSql} ${where}`, values);
    const total = countResult[0].cnt;

    const [rows] = await pool.execute(
      `SELECT cv.*, cr.rule_code, cr.standard as rule_standard, cr.sensor_type as rule_sensor_type,
              rn.node_code, rn.node_name, rn.region as node_region
       ${joinSql} ${where} ORDER BY ${validSortBy} ${validSortOrder} LIMIT ${limitNum} OFFSET ${offsetNum}`,
      values
    );

    return {
      violations: rows.map(normalizeViolation),
      pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / parseInt(limit, 10)) }
    };
  },

  async findViolationById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT cv.*, cr.rule_code, cr.standard as rule_standard, cr.sensor_type as rule_sensor_type,
              rn.node_code, rn.node_name, rn.region as node_region
       FROM compliance_violations cv
       LEFT JOIN compliance_rules cr ON cv.rule_id = cr.id
       LEFT JOIN railway_nodes rn ON cv.node_id = rn.id
       WHERE cv.id = ?`,
      [id]
    );
    return normalizeViolation(rows[0]);
  },

  async createViolation(data) {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO compliance_violations (rule_id, node_id, sensor_type, actual_value, expected_value, severity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.ruleId, data.nodeId, data.sensorType, data.actualValue, data.expectedValue, data.severity, data.status || 'Open']
    );
    return this.findViolationById(result.insertId);
  },

  async getDashboardStats() {
    const pool = getPool();

    // Compliance score: ratio of active rules without open violations
    const [rulesResult] = await pool.execute('SELECT COUNT(*) as cnt FROM compliance_rules WHERE is_active = 1');
    const totalRules = rulesResult[0].cnt;

    const [violationsResult] = await pool.execute('SELECT COUNT(*) as cnt FROM compliance_violations');
    const totalViolations = violationsResult[0].cnt;

    const [openResult] = await pool.execute("SELECT COUNT(*) as cnt FROM compliance_violations WHERE status = 'Open'");
    const openViolations = openResult[0].cnt;

    const [investigatingResult] = await pool.execute("SELECT COUNT(*) as cnt FROM compliance_violations WHERE status = 'Investigating'");
    const [resolvedResult] = await pool.execute("SELECT COUNT(*) as cnt FROM compliance_violations WHERE status = 'Resolved'");

    const complianceScore = totalRules > 0
      ? Math.max(0, Math.round(((totalRules - openViolations) / totalRules) * 100))
      : 100;

    // Severity distribution
    const [sevDist] = await pool.execute('SELECT severity, COUNT(*) as cnt FROM compliance_violations GROUP BY severity');
    const severityDistribution = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    sevDist.forEach(r => { severityDistribution[r.severity] = r.cnt; });

    // Standards breakdown
    const [standards] = await pool.execute(`
      SELECT cr.standard,
             COUNT(DISTINCT cr.id) as rules_count,
             COUNT(CASE WHEN cv.status = 'Open' THEN 1 END) as open_violations,
             COUNT(cv.id) as total_violations
      FROM compliance_rules cr
      LEFT JOIN compliance_violations cv ON cr.id = cv.rule_id
      WHERE cr.is_active = 1
      GROUP BY cr.standard
    `);
    const standardsBreakdown = {};
    standards.forEach(s => {
      standardsBreakdown[s.standard] = {
        rulesCount: s.rules_count,
        openViolations: s.open_violations,
        totalViolations: s.total_violations
      };
    });

    // Sensor type breakdown
    const [sensorDist] = await pool.execute('SELECT sensor_type, COUNT(*) as cnt FROM compliance_violations GROUP BY sensor_type');
    const bySensorType = {};
    sensorDist.forEach(r => { bySensorType[r.sensor_type] = r.cnt; });

    const violationsObj = {
      total: totalViolations,
      open: openViolations,
      investigating: investigatingResult[0].cnt,
      resolved: resolvedResult[0].cnt
    };

    return {
      complianceScore,
      totalRules,
      rules: { active: totalRules, total: totalRules },
      violations: violationsObj,
      violationsSummary: violationsObj,
      severityDistribution,
      bySeverity: severityDistribution,
      bySensorType,
      standardsBreakdown
    };
  }
};

export default complianceRepository;
