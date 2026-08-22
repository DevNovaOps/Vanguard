import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Programmatic seed: creates admin user, railway nodes, connections, and incidents.
 * Idempotent — skips if data already exists.
 */
export const runProgrammaticSeed = async () => {
  const pool = getPool();

  await seedDemoUsers(pool);
  await seedInfrastructure(pool);
  await seedIncidents(pool);
  await seedNotifications(pool);
};

// ─── Seed Admin User ──────────────────────────────────────────────────────────
const seedDemoUsers = async (pool) => {
  try {
    const adminEmail = 'admin123@gmail.com';
    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (rows.length > 0) return;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);
    const permissions = JSON.stringify([
      'dashboard', 'railway-network', 'telemetry', 'infrastructure',
      'risk-analysis', 'compliance', 'incidents', 'autonomous-agent',
      'mitigation', 'audit-logs', 'webhooks', 'reports', 'settings'
    ]);

    await pool.execute(
      `INSERT INTO users (name, email, password, role, department, permissions, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['System Administrator', adminEmail, hashedPassword, 'Admin', 'Management', permissions, 1]
    );
    console.log(`[VANGUARD-DB] Seeded main administrator: ${adminEmail}`);
  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed admin: ${error.message}`);
  }
};

import { generateIndianRailwayNetwork } from '../config/indianRailwaySeed.js';
import routeService from '../services/routeService.js';
import riskService from '../services/riskService.js';

// ─── Seed Railway Infrastructure ──────────────────────────────────────────────
const seedInfrastructure = async (pool) => {
  try {
    // Check if accurate Indian railway network is already seeded (verifying Patna Junction is in Bihar)
    const [patnaCheck] = await pool.execute(
      'SELECT id FROM railway_nodes WHERE node_name LIKE ? AND latitude BETWEEN 25.0 AND 26.0 LIMIT 1',
      ['%Patna%']
    );
    if (patnaCheck.length > 0) {
      const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM railway_nodes');
      console.log(`[VANGUARD-DB] Infrastructure already seeded accurately (${countResult[0].cnt} nodes). Skipping re-seed.`);
      return;
    }

    console.log('[VANGUARD-DB] Seeding accurate Indian Railway Network topology...');

    // Clear old invalid infrastructure
    await pool.execute('DELETE FROM route_segments');
    await pool.execute('DELETE FROM risk_scores');
    await pool.execute('DELETE FROM railway_connections');
    await pool.execute('DELETE FROM railway_nodes');
    console.log('[VANGUARD-DB] Cleared old infrastructure tables.');

    // Generate real geographic nodes & connections
    const { nodes, connections } = generateIndianRailwayNetwork();

    const getValidStatus = (status) => {
      const lower = String(status).toLowerCase();
      if (['healthy', 'warning', 'critical', 'maintenance', 'active', 'inactive'].includes(lower)) {
        if (lower === 'active') return 'Active';
        if (lower === 'inactive') return 'Inactive';
        return lower;
      }
      return 'healthy';
    };

    // Insert nodes in batches of 100
    const nodeData = nodes.map(node => [
      node.nodeCode.toUpperCase(),
      node.nodeName,
      node.nodeType,
      Number(node.latitude),
      Number(node.longitude),
      getValidStatus(node.status),
      node.region
    ]);

    const batchSize = 100;
    for (let i = 0; i < nodeData.length; i += batchSize) {
      const batch = nodeData.slice(i, i + batchSize);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = batch.flat();
      await pool.execute(
        `INSERT INTO railway_nodes (node_code, node_name, node_type, latitude, longitude, status, region) VALUES ${placeholders}`,
        flatValues
      );
    }

    // Get all inserted nodes to map nodeCode -> DB id
    const [insertedNodes] = await pool.execute('SELECT id, node_code FROM railway_nodes');
    const nodeMap = new Map();
    insertedNodes.forEach(n => nodeMap.set(n.node_code, n.id));

    console.log(`[VANGUARD-DB] Seeded ${insertedNodes.length} accurate railway nodes.`);

    // Map connections
    const connectionsData = [];
    connections.forEach(conn => {
      const sourceId = nodeMap.get(conn.sourceCode);
      const targetId = nodeMap.get(conn.targetCode);
      if (sourceId && targetId) {
        connectionsData.push([sourceId, targetId, conn.distance, conn.status || 'Active']);
      }
    });

    // Insert connections in batches of 100
    for (let i = 0; i < connectionsData.length; i += batchSize) {
      const batch = connectionsData.slice(i, i + batchSize);
      const placeholders = batch.map(() => '(?, ?, ?, ?)').join(', ');
      const flatValues = batch.flat();
      await pool.execute(
        `INSERT INTO railway_connections (source_node_id, target_node_id, distance, status) VALUES ${placeholders}`,
        flatValues
      );
    }

    console.log(`[VANGUARD-DB] Seeded ${connectionsData.length} accurate railway connections.`);

    // Generate route segments & risk scores
    try {
      await routeService.generateRouteSegments();
      console.log('[VANGUARD-DB] Route segments generated.');
    } catch (rErr) {
      console.error('[VANGUARD-DB] Route segment generation warning:', rErr.message);
    }

    try {
      await riskService.calculateAllRisks();
      console.log('[VANGUARD-DB] Initial risk scores calculated.');
    } catch (rkErr) {
      console.error('[VANGUARD-DB] Risk score calculation warning:', rkErr.message);
    }

  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed infrastructure: ${error.message}`);
  }
};

// ─── Seed Incidents ───────────────────────────────────────────────────────────
const seedIncidents = async (pool) => {
  try {
    const [countResult] = await pool.execute('SELECT COUNT(*) as cnt FROM incidents');
    if (countResult[0].cnt >= 58) {
      console.log(`[VANGUARD-DB] Incidents already seeded (${countResult[0].cnt} incidents). Skipping re-seed.`);
      return;
    }

    await pool.execute('DELETE FROM incidents');
    console.log('[VANGUARD-DB] Cleared old incident records.');

    const [nodes] = await pool.execute('SELECT id FROM railway_nodes');
    if (nodes.length === 0) {
      console.warn('[VANGUARD-DB] No railway nodes found. Cannot seed incidents.');
      return;
    }

    const teamList = ['Alpha', 'Beta', 'Gamma', 'Delta', null];
    const statusList = ['Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed'];
    const sourceList = ['Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent'];

    const templates = [
      { title: "Track Geometry Defect Detected", description: "Significant crosslevel deviation exceeded alert threshold at track segment 4, warning of minor alignment issue.", severity: "Medium" },
      { title: "Signal Interlocking Anomaly", description: "Unsynchronized relay state transition detected in track circuit junction box J-109.", severity: "High" },
      { title: "Point Machine Slow Operation", description: "Switch machine PM-04 took 4.5 seconds to complete throwing, indicating lack of lubrication or mechanical obstruction.", severity: "Medium" },
      { title: "Transformer Heat Dissipation Issue", description: "Substation transformer cooling fan circuit failure led to elevated top-oil temperature of 82°C.", severity: "High" },
      { title: "OHE Catenary Sag Detected", description: "Overhead equipment tension sensor T-12 registered tension drop of 15%, warning of possible mechanical sag.", severity: "High" },
      { title: "Level Crossing Gate Sensor Anomaly", description: "Axle counter sensor at crossing gate LC-15 failed to register block clearance, keeping gate down.", severity: "High" },
      { title: "Locomotive Hot Box Alarm", description: "Wayside infrared sensor registered wheel bearing temperature of 94°C on leading axle.", severity: "Critical" },
      { title: "Substation Voltage Surge", description: "Traction substation input feeder registered a 29.2kV surge, auto-tripping vacuum circuit breakers.", severity: "Critical" },
      { title: "Axle Counter Sync Failure", description: "Synchronization loss between counter units AC-09 and AC-10 on down-line block.", severity: "Medium" },
      { title: "Broken Rail Joint Detection", description: "Ultrasonic track circuit signature indicates structural discontinuity on track 2 rail weld near approach.", severity: "Critical" },
      { title: "OHE Wire Wear Warning", description: "Contact wire thickness measurement from inspection car registered below 80% original gauge.", severity: "Medium" },
      { title: "Point Motor Overcurrent", description: "Switch motor PM-08 drew 14.5 Amps during movement, indicating mechanical binding or heavy stiffness.", severity: "High" },
      { title: "Substation Battery Charger Failure", description: "DC auxiliary power backup system battery charger output fell below nominal 110V threshold.", severity: "High" },
      { title: "Track Circuit Shunting Malfunction", description: "Track circuit TC-42 failed to shunt during inspection car passage, indicating ballast leakage.", severity: "High" },
      { title: "Fouling Mark Clearance Violation", description: "Optical profile scanner detected obstacle violating clearance envelope on platform line 3.", severity: "Critical" },
      { title: "Signal Lens Soot Obstruction", description: "Optical signal status feedback loops indicate diminished light output, suggesting soot buildup on lenses.", severity: "Low" },
      { title: "Traction Substation Transformer Low Oil", description: "Oil conservator level gauge dropped below minimum mark on Transformer T-3.", severity: "High" },
      { title: "Track Vibration Signature Anomaly", description: "High frequency vibration detected on bogie accelerometers during train crossing on bridge approach.", severity: "Medium" },
      { title: "Pneumatic Brake Supply Low Pressure", description: "Air compressor pressure reservoir registered 4.1 bar (Alert limit is 5 bar) at terminal siding.", severity: "High" },
      { title: "Level Crossing Audio Alarm Failure", description: "Audible crossing bell circuit open-fault detected during active gate cycle.", severity: "Medium" },
      { title: "Telemetry Sensor Link Loss", description: "Traction motor temperature sensor S-44 failed to report status for 5 consecutive polling cycles.", severity: "Low" },
      { title: "OHE Isolator Switch Sparking", description: "Arcing observed on thermal imaging camera during OHE section isolator switch manipulation.", severity: "High" },
      { title: "Axle Counter Wheel Sensor Slip", description: "Axle counter wheel sensor WS-02 reported anomalous pulses, indicating loose bracket mounting.", severity: "Medium" },
      { title: "Point Blade Gapping Defect", description: "Switch PM-12 closed state has a gap of 4mm between switch rail and stock rail (Safety limit is 2mm).", severity: "Critical" },
      { title: "Substation Protective Relay Lockout", description: "Differential protection relay trip initiated lockout state on primary grid feeder circuit.", severity: "Critical" },
      { title: "Bridge Pier Structural Vibration", description: "Seismic accelerometers on Bridge 14 Pier 3 registered vibration peak of 9.2 mm/s during express passage.", severity: "Critical" },
      { title: "Traction Substation Gas Pressure Low", description: "SF6 insulation gas pressure in main circuit breaker tank fell below 3.5 bar safety threshold.", severity: "High" },
      { title: "Switch Blade Wear Breach", description: "Visual inspection logs indicate switch blade profile thickness is below minimum wear index.", severity: "Low" },
      { title: "Unscheduled Power Outage at Terminal", description: "Station auxiliary distribution transformer tripped on overcurrent, switching terminal to diesel generator backup.", severity: "Medium" },
      { title: "Telemetry Packet Jitter Alarm", description: "Network telemetry link for signal tower registered packet loss exceeding 15% over 10 minutes.", severity: "Low" },
      { title: "Locomotive Bogie Hot Axle Detection", description: "Wayside thermal camera flagged box temperature exceeding 96°C on outbound freight express.", severity: "Critical" },
      { title: "Level Crossing Boom Sticking", description: "Gate LC-04 took 12 seconds to fully raise, indicating hydraulic fluid leakage or counterweight offset.", severity: "Medium" },
      { title: "OHE Contact Wire Tension High", description: "Compensation pulley weight stack reached end-of-travel constraint, risking mechanical overload.", severity: "Medium" },
      { title: "Friction Buffer Stop Displacement", description: "Siding friction buffer stop moved 15cm from nominal placement following shunting contact.", severity: "Low" },
      { title: "Track Circuit Ballast Resistance Low", description: "Sub-grade drainage blockage caused heavy water logging, degrading ballast resistance on TC-10.", severity: "Medium" },
      { title: "Interlocking Signal Aspect Mismatch", description: "Relay logic output and physical signal lamp feedback show mismatch on signal S-21.", severity: "Critical" },
      { title: "Point Machine Overheating", description: "Switch machine PM-15 motor winding temperature exceeded 85°C during high traffic period.", severity: "Medium" },
      { title: "Substation Transformer Overload", description: "Peak traction load exceeded rated transformer capacity by 15% for a continuous 20 minutes.", severity: "High" },
      { title: "OHE Dropper Wire Breakage", description: "Inspection camera detected broken dropper wire between contact and catenary cables at span 22.", severity: "High" },
      { title: "Level Crossing Obstacle Detection Triggered", description: "LIDAR scanner at crossing LC-08 detected a stalled vehicle footprint on active tracks.", severity: "Critical" },
      { title: "Axle Counter Direction Discrepancy", description: "Block section counter flagged direction mismatch, indicating counting discrepancy or reverse wheel creep.", severity: "High" },
      { title: "Track Expansion Anomaly", description: "Continuous Welded Rail (CWR) expansion joint reached maximum expansion limit due to ambient heat.", severity: "High" },
      { title: "Tunnel Ventilation Fan Trip", description: "Auxiliary ventilation fan EF-02 in main tunnel tripped due to motor winding phase imbalance.", severity: "Medium" },
      { title: "Signal Cabin Auxiliary Power Down", description: "Main utility grid phase failure switched signal cabin logic systems to double-conversion UPS backup.", severity: "Medium" },
      { title: "Point Drive Crank Lock Anomaly", description: "Mechanical locking detection switch failed to engage following switch rail repositioning.", severity: "Critical" },
      { title: "Substation Earth Leakage Alarm", description: "Neutral ground current sensor registered 4.2 Amps leakage, indicating insulator tracking.", severity: "High" },
      { title: "Traction Motor Overcurrent Anomaly", description: "Locomotive traction motor 4 drew 480 Amps during heavy grade start, violating load curve.", severity: "Medium" },
      { title: "OHE Tension Compensator Cable Slip", description: "Auto-tensioning device steel wire rope registered minor fraying on compensation pulley.", severity: "Low" },
      { title: "Broken Track Circuit Joint Insulator", description: "Insulated rail joint IRJ-14 resistance dropped to 12 Ohms, causing track circuit fault indication.", severity: "Critical" },
      { title: "Fouling Bar Mechanical Bind", description: "Switch safety fouling bar failed to fully restore to normal height after wheel passage.", severity: "High" },
      { title: "Level Crossing LED Aspect Failure", description: "Red LED traffic warning array at crossing LC-12 has multiple dark cells, reducing visibility.", severity: "Low" },
      { title: "Substation Vacuum Interrupter Leak", description: "Vacuum circuit breaker VCB-03 monitoring systems indicate envelope pressure rise.", severity: "High" },
      { title: "Locomotive Braking Resistor Overheat", description: "Dynamic braking resistor bank temperature sensor reached 145°C during grade descent.", severity: "Medium" },
      { title: "Catenary Wire Splice Heat Anomaly", description: "Thermal imaging inspection flagged 85°C hotspot on contact wire splice segment.", severity: "Medium" },
      { title: "Track Fastener Displacement", description: "Concrete sleeper elastic rail clip missing on curve segment 8, track approach siding.", severity: "Low" },
      { title: "Signal Tower Relay Contacts Welded", description: "Safety monitoring logic flagged locked contacts on intermediate block signaling relay.", severity: "Critical" },
      { title: "Axle Counter Reset Key Lockout", description: "Authorized manual reset key command failed to restore block status, requiring local checkout.", severity: "High" },
      { title: "Point Motor Carbon Brush Wear", description: "Direct-current motor diagnostic telemetry warning indicates high commutator sparking index.", severity: "Low" }
    ];

    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    const incidentRows = [];
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const nodeIndex = i % nodes.length;
      const node = nodes[nodeIndex];

      let riskScore = 15;
      if (template.severity === 'Critical') riskScore = 82 + (i % 17);
      else if (template.severity === 'High') riskScore = 62 + (i % 17);
      else if (template.severity === 'Medium') riskScore = 32 + (i % 27);
      else riskScore = 10 + (i % 21);

      const status = statusList[i % statusList.length];
      const assignedTeam = teamList[i % teamList.length];
      const source = sourceList[i % sourceList.length];
      const createdAt = new Date(Date.now() - (i * 3 * 3600 * 1000) - (Math.random() * 2 * 3600 * 1000));
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const incidentId = `INC-${dateStr}-${randomPart}-${i}`;

      incidentRows.push([
        incidentId, node.id, riskScore, template.severity, template.title,
        template.description, status, assignedTeam, source, createdAt
      ]);
    }

    // Insert incidents in a single batch
    const placeholders = incidentRows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = incidentRows.flat();
    await pool.execute(
      `INSERT INTO incidents (incident_id, node_id, risk_score, severity, title, description, status, assigned_team, source, created_at)
       VALUES ${placeholders}`,
      flatValues
    );

    console.log(`[VANGUARD-DB] Seeded ${incidentRows.length} highly realistic incidents.`);
  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed incidents: ${error.message}`);
  }
};

const seedNotifications = async (pool) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as cnt FROM notifications');
    if (rows[0].cnt > 0) return;

    const notifs = [
      ['NTF-000001', 'Thermal Anomaly Isolated', 'Sensor S-011 at Patna Junction reporting 138°C bearing overheating in Transformer Unit 2.', 'Alert', 'Critical', 'Sensor'],
      ['NTF-000002', 'Risk Score Escalation', 'Risk score escalated to 82/100 for Vadodara Freight Yard due to structural vibration deviation.', 'Risk', 'Warning', 'Risk'],
      ['NTF-000003', 'AI Mitigation Executed', 'Emergency speed restriction (30 km/h) & coolant flush auto-applied at Surat Crossing.', 'Mitigation', 'Info', 'Mitigation'],
      ['NTF-000004', 'RDSO Safety Audit Verified', 'Track geometric compliance verified at 96.4% across Western Railway Corridor.', 'Compliance', 'Info', 'Compliance'],
      ['NTF-000005', 'Emergency Incident Auto-Generated', 'Incident INC-2848 created for Power Substation TSS-04 and assigned to Field Ops.', 'Incident', 'Critical', 'Incident']
    ];

    for (const [nid, title, msg, type, sev, mod] of notifs) {
      await pool.execute(
        `INSERT INTO notifications (notification_id, title, message, type, severity, module)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nid, title, msg, type, sev, mod]
      );
    }
    console.log('[VANGUARD-DB] Seeded real railway notifications');
  } catch (err) {
    console.error(`[VANGUARD-DB] Failed to seed notifications: ${err.message}`);
  }
};

export default { runProgrammaticSeed };
