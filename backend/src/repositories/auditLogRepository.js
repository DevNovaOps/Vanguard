import { getPool } from '../config/database.js';

const normalizeAuditLog = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    auditId: row.audit_id,
    userId: row.user_id ? String(row.user_id) : null,
    username: row.username,
    role: row.role,
    action: row.action,
    module: row.module,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    severity: row.severity,
    metadata: row.metadata || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    timestamp: row.timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const auditLogRepository = {
  async create({ userId, username, role, action, module, entityType, entityId, description, severity, metadata, ipAddress, userAgent }) {
    const pool = getPool();

    // Generate sequential audit ID
    const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM audit_logs');
    const count = countResult[0].cnt + 1;
    const auditId = `AUD-${String(count).padStart(6, '0')}`;

    const [result] = await pool.execute(
      `INSERT INTO audit_logs (audit_id, user_id, username, role, action, module, entity_type, entity_id, description, severity, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId, userId || null, username || 'System', role || 'System',
        action, module, entityType || null, entityId || null,
        description, severity || 'Info',
        JSON.stringify(metadata || {}),
        ipAddress || null, userAgent || null
      ]
    );

    return this.findById(result.insertId);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM audit_logs WHERE id = ?', [id]);
    return normalizeAuditLog(rows[0]);
  },

  async findByAuditId(auditId) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM audit_logs WHERE audit_id = ?', [auditId]);
    return normalizeAuditLog(rows[0]);
  },

  async findByIdOrAuditId(idParam) {
    const pool = getPool();
    // Try numeric ID first, then audit_id
    const numId = parseInt(idParam, 10);
    if (!isNaN(numId) && String(numId) === String(idParam)) {
      return this.findById(numId);
    }
    return this.findByAuditId(idParam);
  },

  async findAll(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];
    const { page = 1, limit = 50, action, module, severity, userId, search, sortBy = 'timestamp', sortOrder = 'DESC' } = filters;

    if (action) { conditions.push('action = ?'); values.push(action); }
    if (module) { conditions.push('module = ?'); values.push(module); }
    if (severity) { conditions.push('severity = ?'); values.push(severity); }
    if (userId) { conditions.push('user_id = ?'); values.push(userId); }
    if (search) {
      conditions.push('(description LIKE ? OR username LIKE ? OR action LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortBy = ['timestamp', 'severity', 'action', 'module', 'created_at'].includes(sortBy) ? sortBy : 'timestamp';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    // Count total
    const [countResult] = await pool.execute(`SELECT COUNT(*) as cnt FROM audit_logs ${where}`, values);
    const total = countResult[0].cnt;

    // Fetch page
    const [rows] = await pool.execute(
      `SELECT * FROM audit_logs ${where} ORDER BY ${validSortBy} ${validSortOrder} LIMIT ${limitNum} OFFSET ${offsetNum}`,
      values
    );

    return {
      logs: rows.map(normalizeAuditLog),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    };
  },

  async getStatistics() {
    const pool = getPool();

    const [totalResult] = await pool.execute('SELECT COUNT(*) as cnt FROM audit_logs');
    const total = totalResult[0].cnt;

    const [severityCounts] = await pool.execute('SELECT severity, COUNT(*) as cnt FROM audit_logs GROUP BY severity');
    const bySeverity = { Info: 0, Warning: 0, Critical: 0 };
    severityCounts.forEach(r => { bySeverity[r.severity] = r.cnt; });

    const [moduleCounts] = await pool.execute('SELECT module, COUNT(*) as cnt FROM audit_logs GROUP BY module ORDER BY cnt DESC');

    const [recentLogs] = await pool.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10');

    // Today's count
    const [todayResult] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM audit_logs WHERE DATE(timestamp) = CURDATE()'
    );

    return {
      totalLogs: total,
      bySeverity,
      byModule: moduleCounts,
      recentActivity: recentLogs.map(normalizeAuditLog),
      todayCount: todayResult[0].cnt
    };
  },

  async exportAll(filters = {}) {
    const pool = getPool();
    const conditions = [];
    const values = [];

    if (filters.action) { conditions.push('action = ?'); values.push(filters.action); }
    if (filters.module) { conditions.push('module = ?'); values.push(filters.module); }
    if (filters.severity) { conditions.push('severity = ?'); values.push(filters.severity); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC`,
      values
    );
    return rows.map(normalizeAuditLog);
  }
};

export default auditLogRepository;
