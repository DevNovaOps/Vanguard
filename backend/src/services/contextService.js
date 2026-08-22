import db from '../config/database.js';

/**
 * Context Service
 * Manages operational contexts and their state snapshots.
 * All queries are user-scoped for security.
 */
class ContextService {

  // ── Default snapshot for new contexts ──
  static defaultSnapshot(contextType = 'Train') {
    const envDefaults = {
      Train: 'Plains', Bridge: 'Coastal', Station: 'Plains',
      Tunnel: 'Tunnel', Transformer: 'Plains', Track: 'Plains', Custom: 'Plains'
    };
    return {
      chatMessages: [
        { sender: 'agent', text: 'Vanguard AI Agent ready. How can I assist you with this context?', time: new Date().toISOString() }
      ],
      currentEnv: envDefaults[contextType] || 'Plains',
      rightDrawerTab: null,
      incidents: [],
      twin: {
        cameraView: 'isometric',
        weatherMode: 'sunny',
        activeEmergency: null,
        currentEnvironment: envDefaults[contextType] || 'Plains',
        activeDashboard: null
      },
      sensorConfig: {
        environment: envDefaults[contextType] || 'Plains'
      },
      userNotes: ''
    };
  }

  // ── List all active contexts for a user ──
  async listContexts(userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      const [rows] = await conn.query(
        `SELECT id, name, type, icon, color, status, is_pinned, last_used, created_at, updated_at 
         FROM operational_contexts 
         WHERE user_id = ? AND status = 'Active' 
         ORDER BY is_pinned DESC, last_used DESC`,
        [userId]
      );
      return rows;
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Get single context ──
  async getContext(id, userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      const [rows] = await conn.query(
        `SELECT * FROM operational_contexts WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return rows[0] || null;
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Create context with default snapshot ──
  async createContext(userId, { name, type = 'Train', icon = '🚂', color = '#3b82f6' }) {
    let conn;
    try {
      conn = await db.getPool().getConnection();

      // Check max contexts per user (limit 20)
      const [countResult] = await conn.query(
        `SELECT COUNT(*) as cnt FROM operational_contexts WHERE user_id = ? AND status = 'Active'`,
        [userId]
      );
      if (countResult[0].cnt >= 20) {
        throw new Error('Maximum 20 active contexts allowed per user');
      }

      const [result] = await conn.query(
        `INSERT INTO operational_contexts (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
        [userId, name, type, icon, color]
      );
      const contextId = result.insertId;

      // Seed default snapshot
      const defaultState = ContextService.defaultSnapshot(type);
      await conn.query(
        `INSERT INTO context_snapshots (context_id, state_data) VALUES (?, ?)`,
        [contextId, JSON.stringify(defaultState)]
      );

      return { id: contextId, name, type, icon, color, status: 'Active', is_pinned: 0 };
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Update context metadata ──
  async updateContext(id, userId, data) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      const fields = [];
      const values = [];

      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
      if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
      if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
      if (data.is_pinned !== undefined) { fields.push('is_pinned = ?'); values.push(data.is_pinned ? 1 : 0); }

      if (fields.length === 0) return null;

      values.push(id, userId);
      await conn.query(
        `UPDATE operational_contexts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );

      return this.getContext(id, userId);
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Archive (soft delete) ──
  async archiveContext(id, userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      await conn.query(
        `UPDATE operational_contexts SET status = 'Archived' WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return { success: true };
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Restore archived context ──
  async restoreContext(id, userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      await conn.query(
        `UPDATE operational_contexts SET status = 'Active' WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      return { success: true };
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Duplicate context ──
  async duplicateContext(id, userId, newName) {
    let conn;
    try {
      conn = await db.getPool().getConnection();

      // Get original
      const [origRows] = await conn.query(
        `SELECT * FROM operational_contexts WHERE id = ? AND user_id = ?`,
        [id, userId]
      );
      if (!origRows[0]) throw new Error('Context not found');
      const orig = origRows[0];

      // Get original snapshot
      const [snapRows] = await conn.query(
        `SELECT state_data FROM context_snapshots WHERE context_id = ?`,
        [id]
      );
      const origState = snapRows[0]?.state_data || ContextService.defaultSnapshot(orig.type);

      // Create duplicate
      const [result] = await conn.query(
        `INSERT INTO operational_contexts (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
        [userId, newName || `${orig.name} (Copy)`, orig.type, orig.icon, orig.color]
      );
      const newId = result.insertId;

      // Clone snapshot
      await conn.query(
        `INSERT INTO context_snapshots (context_id, state_data) VALUES (?, ?)`,
        [newId, JSON.stringify(origState)]
      );

      return { id: newId, name: newName || `${orig.name} (Copy)`, type: orig.type, icon: orig.icon, color: orig.color, status: 'Active' };
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Save state snapshot ──
  async saveSnapshot(contextId, userId, stateData) {
    let conn;
    try {
      conn = await db.getPool().getConnection();

      // Verify ownership
      const [ctx] = await conn.query(
        `SELECT id FROM operational_contexts WHERE id = ? AND user_id = ?`,
        [contextId, userId]
      );
      if (!ctx[0]) throw new Error('Context not found');

      // Update last_used
      await conn.query(`UPDATE operational_contexts SET last_used = NOW() WHERE id = ?`, [contextId]);

      // Upsert snapshot
      await conn.query(
        `INSERT INTO context_snapshots (context_id, state_data) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE state_data = VALUES(state_data), updated_at = NOW()`,
        [contextId, JSON.stringify(stateData)]
      );

      return { success: true };
    } finally {
      if (conn) conn.release();
    }
  }

  // ── Load state snapshot ──
  async loadSnapshot(contextId, userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();

      // Verify ownership
      const [ctx] = await conn.query(
        `SELECT id, type FROM operational_contexts WHERE id = ? AND user_id = ?`,
        [contextId, userId]
      );
      if (!ctx[0]) throw new Error('Context not found');

      const [rows] = await conn.query(
        `SELECT state_data FROM context_snapshots WHERE context_id = ?`,
        [contextId]
      );

      return rows[0]?.state_data || ContextService.defaultSnapshot(ctx[0].type);
    } finally {
      if (conn) conn.release();
    }
  }

    // ── Seed default contexts for a user (called on first access) ──
  async seedDefaultContexts(userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      const [existing] = await conn.query(
        `SELECT COUNT(*) as cnt FROM operational_contexts WHERE user_id = ?`,
        [userId]
      );
      if (existing[0].cnt > 0) return; // already seeded

      const defaults = [
        {
          name: 'Rajdhani Express', type: 'Train', icon: '🚂', color: '#3b82f6',
          state: {
            currentEnv: 'Plains',
            chatMessages: [{ sender: 'agent', text: 'Rajdhani Express context loaded. All systems nominal. Proceeding at standard operating speed.', time: new Date().toISOString() }],
            incidents: [],
            twin: { cameraView: 'isometric', weatherMode: 'sunny', activeEmergency: null, currentEnvironment: 'Plains' }
          }
        },
        {
          name: 'Vande Bharat', type: 'Train', icon: '🚄', color: '#6366f1',
          state: {
            currentEnv: 'Plains',
            chatMessages: [
              { sender: 'agent', text: '⚠️ **WARNING**: High bearing temperature detected on Axle 3.', time: new Date().toISOString() },
              { sender: 'user', text: 'Reduce speed to 80 km/h and generate work order.', time: new Date().toISOString() },
              { sender: 'agent', text: 'Speed reduced. Work Order #WO-892 generated.', time: new Date().toISOString() }
            ],
            incidents: [{ time: '14:22', text: 'Bearing Temp Warning (Axle 3)', severity: 'warning' }],
            twin: { cameraView: 'driver', weatherMode: 'cloudy', activeEmergency: null, currentEnvironment: 'Plains', speed: 80 }
          }
        },
        {
          name: 'Freight Train', type: 'Train', icon: '🚛', color: '#f59e0b',
          state: {
            currentEnv: 'Desert',
            chatMessages: [{ sender: 'agent', text: '🚨 **CRITICAL**: Motor overheating on Locomotive B.', time: new Date().toISOString() }],
            incidents: [{ time: '14:25', text: 'Motor Overheat (Loco B)', severity: 'critical' }],
            twin: { cameraView: 'isometric', weatherMode: 'sunny', activeEmergency: 'fire', currentEnvironment: 'Desert', speed: 0 }
          }
        },
        {
          name: 'Bridge Monitoring', type: 'Bridge', icon: '🌉', color: '#06b6d4',
          state: {
            currentEnv: 'Coastal',
            chatMessages: [{ sender: 'agent', text: 'High structural vibration detected on Bridge P-14.', time: new Date().toISOString() }],
            incidents: [{ time: '14:30', text: 'Structural Vibration Alert', severity: 'warning' }],
            twin: { cameraView: 'bridge', weatherMode: 'rainy', activeEmergency: null, currentEnvironment: 'Coastal' }
          }
        },
        {
          name: 'Tunnel Monitoring', type: 'Tunnel', icon: '🚇', color: '#8b5cf6',
          state: {
            currentEnv: 'Tunnel',
            chatMessages: [{ sender: 'agent', text: '🚨 **CRITICAL**: Gas leak detected in Tunnel T-7.', time: new Date().toISOString() }],
            incidents: [{ time: '14:35', text: 'Gas Leak Detected', severity: 'critical' }],
            twin: { cameraView: 'tunnel', weatherMode: 'dark', activeEmergency: 'smoke', currentEnvironment: 'Tunnel' }
          }
        },
        {
          name: 'Transformer Monitoring', type: 'Substation', icon: '⚡', color: '#ef4444',
          state: {
            currentEnv: 'Plains',
            chatMessages: [{ sender: 'agent', text: 'Voltage fluctuation detected at Substation Alpha.', time: new Date().toISOString() }],
            incidents: [{ time: '14:40', text: 'Voltage Fluctuation', severity: 'warning' }],
            twin: { cameraView: 'isometric', weatherMode: 'sunny', activeEmergency: null, currentEnvironment: 'Plains' }
          }
        }
      ];

      for (const ctx of defaults) {
        // Create context
        const [result] = await conn.query(
          `INSERT INTO operational_contexts (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)`,
          [userId, ctx.name, ctx.type, ctx.icon, ctx.color]
        );
        const contextId = result.insertId;

        // Seed rich snapshot
        await conn.query(
          `INSERT INTO context_snapshots (context_id, state_data) VALUES (?, ?)`,
          [contextId, JSON.stringify(ctx.state)]
        );
      }
    } finally {
      if (conn) conn.release();
    }
  }
}

export default new ContextService();
