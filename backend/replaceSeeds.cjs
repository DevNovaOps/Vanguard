const fs = require('fs');

const path = 'src/services/contextService.js';
let content = fs.readFileSync(path, 'utf8');

const replacement = `  // ── Seed default contexts for a user (called on first access) ──
  async seedDefaultContexts(userId) {
    let conn;
    try {
      conn = await db.getPool().getConnection();
      const [existing] = await conn.query(
        \`SELECT COUNT(*) as cnt FROM operational_contexts WHERE user_id = ?\`,
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
          \`INSERT INTO operational_contexts (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)\`,
          [userId, ctx.name, ctx.type, ctx.icon, ctx.color]
        );
        const contextId = result.insertId;

        // Seed rich snapshot
        await conn.query(
          \`INSERT INTO context_snapshots (context_id, state_data) VALUES (?, ?)\`,
          [contextId, JSON.stringify(ctx.state)]
        );
      }
    } finally {
      if (conn) conn.release();
    }
  }`;

const startRegex = /\/\/ ── Seed default contexts for a user \(called on first access\) ──/m;
const endRegex = /export default new ContextService\(\);/m;

const startIndex = content.search(startRegex);
const endIndex = content.search(endRegex);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find the target block to replace.");
  process.exit(1);
}

const before = content.slice(0, startIndex);
const after = content.slice(endIndex);

fs.writeFileSync(path, before + replacement + '\n}\n\n' + after);
console.log('Contexts seeded successfully!');
