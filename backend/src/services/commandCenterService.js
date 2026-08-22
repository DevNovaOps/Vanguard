import db from '../config/database.js';
import sensorService from './sensorService.js';
import { runMultiAgentPipeline } from '../utils/pythonRunner.js';

class CommandCenterService {
  
  async getExecutiveSummary(contextId) {
    let connection;
    try {
      const pool = db.getPool();
      connection = await pool.getConnection();
      
      // Calculate Overall Railway Health (Avg of train health)
      const [trains] = await connection.query(`SELECT AVG(health_score) as avg_health FROM trains`);
      let overallHealth = trains[0].avg_health ? Number(trains[0].avg_health) : 95.0;

      // Critical Alerts
      const [incidents] = await connection.query(`SELECT COUNT(*) as count FROM incidents WHERE severity = 'Critical' AND status NOT IN ('Resolved', 'Closed')`);
      let criticalAlerts = incidents[0].count;

      // Pending Work Orders
      const [workOrders] = await connection.query(`SELECT COUNT(*) as count FROM work_orders WHERE status NOT IN ('Completed', 'Cancelled')`);
      let pendingWorkOrders = workOrders[0].count;

      // Pseudo-isolate based on contextId to simulate different contexts
      if (contextId) {
        // Use contextId to deterministically skew the numbers
        const idSkew = (contextId % 5);
        overallHealth = Math.min(100, Math.max(0, overallHealth - idSkew * 1.5));
        criticalAlerts = Math.max(0, criticalAlerts + (idSkew === 2 ? 3 : -1));
        pendingWorkOrders = Math.max(0, pendingWorkOrders + idSkew * 2);
      }
      
      const predictedFailures = contextId && (contextId % 2 === 0) ? 9 : 7;

      // Estimated Savings (mock calculation)
      const [costs] = await connection.query(`SELECT SUM(cost) as total FROM maintenance_costs WHERE type = 'Predictive'`);
      const savings = costs[0].total ? (Number(costs[0].total) / 100000).toFixed(2) + 'L' : '2.4L';

      return {
        overallHealth: `${overallHealth.toFixed(1)}%`,
        criticalAlerts,
        pendingWorkOrders,
        predictedFailures,
        estimatedSavings: `₹${savings}`,
        systemStatus: criticalAlerts > 0 ? 'Warning' : 'Operational'
      };
    } catch (err) {
      console.error('[CommandCenterService] Error getting executive summary', err);
      throw err;
    } finally {
      if (connection && typeof connection.release === 'function') connection.release();
    }
  }

  async getDigitalTwin() {
    return await sensorService.getDigitalTwinState();
  }

  async getPredictiveMaintenance(contextId) {
    // Generate some mock forecast based on sensor decays
    const base = [
      { asset: 'Track Segment A', failureProbability: 85, timeframe: '2 days', recommendation: 'Immediate inspection' },
      { asset: 'Engine Cooling Unit', failureProbability: 60, timeframe: '1 week', recommendation: 'Schedule maintenance' },
      { asset: 'Signal Node 4', failureProbability: 40, timeframe: '1 month', recommendation: 'Monitor vibration' }
    ];
    if (contextId && contextId % 2 === 0) {
      return [
        { asset: 'Axle Bearing 3', failureProbability: 92, timeframe: '12 hours', recommendation: 'Reduce speed, schedule repair' },
        { asset: 'Braking Pad B', failureProbability: 75, timeframe: '3 days', recommendation: 'Replace pads' },
        ...base.slice(1)
      ];
    }
    return base;
  }

  async askAiAgent(query) {
    try {
      console.log(`[CommandCenterService] Passing query to AI Agent: ${query}`);
      // Reuse existing agent pipeline
      const result = await runMultiAgentPipeline(query, {
        temperature: 45, vibration: 2.1, gas: 10, power: 25, riskScore: 10
      });
      return result;
    } catch (error) {
      console.error('[CommandCenterService] AI Agent error:', error);
      throw error;
    }
  }

  async getWorkOrders() {
    let connection;
    try {
      const pool = db.getPool();
      connection = await pool.getConnection();
      const [rows] = await connection.query(`SELECT * FROM work_orders ORDER BY created_at DESC`);
      return rows;
    } catch (err) {
      throw err;
    } finally {
      if (connection && typeof connection.release === 'function') connection.release();
    }
  }

  async getMaintenanceCosts() {
    let connection;
    try {
      const pool = db.getPool();
      connection = await pool.getConnection();
      const [rows] = await connection.query(`SELECT * FROM maintenance_costs ORDER BY date DESC`);
      return rows;
    } catch (err) {
      throw err;
    } finally {
      if (connection && typeof connection.release === 'function') connection.release();
    }
  }

  async getTrainHealth() {
    let connection;
    try {
      const pool = db.getPool();
      connection = await pool.getConnection();
      const [rows] = await connection.query(`SELECT * FROM trains`);
      return rows;
    } catch (err) {
      throw err;
    } finally {
      if (connection && typeof connection.release === 'function') connection.release();
    }
  }
}

export default new CommandCenterService();
