import dns from 'dns';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import RailwayNode from '../models/RailwayNode.js';
import RailwayConnection from '../models/RailwayConnection.js';
import ComplianceRule from '../models/ComplianceRule.js';
import RiskScore from '../models/RiskScore.js';
import RouteSegment from '../models/RouteSegment.js';
import Incident from '../models/Incident.js';
import riskService from '../services/riskService.js';
import routeService from '../services/routeService.js';
import { generateIndianRailwayNetwork } from './indianRailwaySeed.js';

// Setup DNS servers to Google DNS for reliable SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4']);

const seedDemoUsers = async () => {
  try {
    const adminEmail = 'admin123@gmail.com';
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: 'Admin@123',
        role: 'Admin',
        department: 'Management',
        permissions: ['dashboard', 'railway-network', 'telemetry', 'infrastructure', 'risk-analysis', 'compliance', 'incidents', 'autonomous-agent', 'mitigation', 'audit-logs', 'webhooks', 'reports', 'settings'],
        isActive: true
      });
      console.log(`[VANGUARD-DB] Seeded main administrator: ${adminEmail}`);
    }
  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed main administrator: ${error.message}`);
  }
};

const seedInfrastructure = async () => {
  try {
    // Check if we already have the new nodes seeded
    const hasNewNodes = await RailwayNode.findOne({ nodeCode: 'ND0001' });
    if (hasNewNodes) {
      const existingCount = await RailwayNode.countDocuments({});
      console.log(`[VANGUARD-DB] Infrastructure already seeded with new nodes (${existingCount} nodes). Skipping re-seed.`);
      return;
    }

    await RailwayNode.deleteMany({});
    await RailwayConnection.deleteMany({});
    await RiskScore.deleteMany({});
    await RouteSegment.deleteMany({});
    console.log('[VANGUARD-DB] Cleared old infrastructure collections.');

    console.log('[VANGUARD-DB] Seeding new Railway Network from vanguard_railway_nodes_1200.json...');
    
    // Resolve path to JSON file
    const jsonPath = path.resolve(process.cwd(), 'src/data/vanguard_railway_nodes_1200.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const parsedNodes = JSON.parse(rawData);

    // Map and sanitize status enum
    const getValidStatus = (status) => {
      const lower = String(status).toLowerCase();
      if (['healthy', 'warning', 'critical', 'maintenance', 'active', 'inactive'].includes(lower)) {
        if (lower === 'active') return 'Active';
        if (lower === 'inactive') return 'Inactive';
        return lower;
      }
      if (lower === 'degraded') return 'warning';
      return 'healthy';
    };

    const nodeData = parsedNodes.map(node => ({
      nodeCode: node.nodeCode.toUpperCase(),
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      latitude: Number(node.latitude),
      longitude: Number(node.longitude),
      status: getValidStatus(node.status),
      region: node.region
    }));

    const createdNodes = await RailwayNode.insertMany(nodeData);
    console.log(`[VANGUARD-DB] Seeded ${createdNodes.length} railway nodes.`);

    // Generate dynamic connections between closest nodes in the same region
    const connectionsData = [];
    const connectionSet = new Set();

    const getDistance = (n1, n2) => {
      const dy = n1.latitude - n2.latitude;
      const dx = n1.longitude - n2.longitude;
      return Math.sqrt(dx*dx + dy*dy);
    };

    for (let i = 0; i < createdNodes.length; i++) {
      const nodeA = createdNodes[i];
      const candidates = createdNodes
        .filter(n => n.nodeCode !== nodeA.nodeCode && n.region === nodeA.region)
        .map(n => ({ node: n, dist: getDistance(nodeA, n) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);

      for (const cand of candidates) {
        const nodeB = cand.node;
        const key = [nodeA.nodeCode, nodeB.nodeCode].sort().join('|');
        if (!connectionSet.has(key)) {
          connectionSet.add(key);
          connectionsData.push({
            sourceNode: nodeA._id,
            targetNode: nodeB._id,
            distance: parseFloat(Math.max(cand.dist * 111, 1).toFixed(1)),
            status: 'Active'
          });
        }
      }
    }

    const createdConnections = await RailwayConnection.insertMany(connectionsData);
    console.log(`[VANGUARD-DB] Seeded ${createdConnections.length} railway connections.`);
  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed geographical infrastructure: ${error.message}`);
  }
};

const seedComplianceRules = async () => {
  try {
    const rules = [
      {
        ruleCode: 'API617-TEMP',
        standard: 'API 617',
        sensorType: 'Temperature',
        minValue: 0,
        maxValue: 120,
        severity: 'High',
        description: 'Centrifugal compressor temperature compliance thresholds according to the API 617 engineering standards.'
      },
      {
        ruleCode: 'RDSO-SPEC',
        standard: 'RDSO',
        sensorType: 'Vibration',
        minValue: 0,
        maxValue: 15,
        severity: 'Critical',
        description: 'Vibration tolerances for locomotive chassis structure per RDSO compliance specifications.'
      },
      {
        ruleCode: 'IEC-61850',
        standard: 'IEC 61850',
        sensorType: 'Voltage',
        minValue: 220,
        maxValue: 240,
        severity: 'Medium',
        description: 'Voltage deviation limits for power utility automation equipment defined under standard IEC-61850.'
      },
      {
        ruleCode: 'UIC-714',
        standard: 'UIC 714',
        sensorType: 'Pressure',
        minValue: 2,
        maxValue: 8,
        severity: 'Critical',
        description: 'Pneumatic braking system pressure boundaries for rolling stock compliance standard UIC 714.'
      }
    ];

    for (const rule of rules) {
      const exists = await ComplianceRule.findOne({ ruleCode: rule.ruleCode });
      if (!exists) {
        await ComplianceRule.create(rule);
        console.log(`[VANGUARD-DB] Seeded compliance rule: ${rule.ruleCode}`);
      }
    }
  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed compliance rules: ${error.message}`);
  }
};

const seedIncidents = async () => {
  try {
    const existingCount = await Incident.countDocuments({});
    if (existingCount >= 58) {
      console.log(`[VANGUARD-DB] Incidents already seeded (${existingCount} incidents). Skipping re-seed.`);
      return;
    }

    await Incident.deleteMany({});
    console.log('[VANGUARD-DB] Cleared old incident records.');

    const nodes = await RailwayNode.find({});
    if (nodes.length === 0) {
      console.warn('[VANGUARD-DB] No railway nodes found. Cannot seed incidents.');
      return;
    }

    const teamList = ['Alpha', 'Beta', 'Gamma', 'Delta', null];
    const statusList = ['Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed'];
    const sourceList = ['Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent'];

    // 58 realistic incident titles & descriptions
    const templates = [
      {
        title: "Track Geometry Defect Detected",
        description: "Significant crosslevel deviation exceeded alert threshold at track segment 4, warning of minor alignment issue.",
        severity: "Medium"
      },
      {
        title: "Signal Interlocking Anomaly",
        description: "Unsynchronized relay state transition detected in track circuit junction box J-109.",
        severity: "High"
      },
      {
        title: "Point Machine Slow Operation",
        description: "Switch machine PM-04 took 4.5 seconds to complete throwing, indicating lack of lubrication or mechanical obstruction.",
        severity: "Medium"
      },
      {
        title: "Transformer Heat Dissipation Issue",
        description: "Substation transformer cooling fan circuit failure led to elevated top-oil temperature of 82°C.",
        severity: "High"
      },
      {
        title: "OHE Catenary Sag Detected",
        description: "Overhead equipment tension sensor T-12 registered tension drop of 15%, warning of possible mechanical sag.",
        severity: "High"
      },
      {
        title: "Level Crossing Gate Sensor Anomaly",
        description: "Axle counter sensor at crossing gate LC-15 failed to register block clearance, keeping gate down.",
        severity: "High"
      },
      {
        title: "Locomotive Hot Box Alarm",
        description: "Wayside infrared sensor registered wheel bearing temperature of 94°C on leading axle.",
        severity: "Critical"
      },
      {
        title: "Substation Voltage Surge",
        description: "Traction substation input feeder registered a 29.2kV surge, auto-tripping vacuum circuit breakers.",
        severity: "Critical"
      },
      {
        title: "Axle Counter Sync Failure",
        description: "Synchronization loss between counter units AC-09 and AC-10 on down-line block.",
        severity: "Medium"
      },
      {
        title: "Broken Rail Joint Detection",
        description: "Ultrasonic track circuit signature indicates structural discontinuity on track 2 rail weld near approach.",
        severity: "Critical"
      },
      {
        title: "OHE Wire Wear Warning",
        description: "Contact wire thickness measurement from inspection car registered below 80% original gauge.",
        severity: "Medium"
      },
      {
        title: "Point Motor Overcurrent",
        description: "Switch motor PM-08 drew 14.5 Amps during movement, indicating mechanical binding or heavy stiffness.",
        severity: "High"
      },
      {
        title: "Substation Battery Charger Failure",
        description: "DC auxiliary power backup system battery charger output fell below nominal 110V threshold.",
        severity: "High"
      },
      {
        title: "Track Circuit Shunting Malfunction",
        description: "Track circuit TC-42 failed to shunt during inspection car passage, indicating ballast leakage.",
        severity: "High"
      },
      {
        title: "Fouling Mark Clearance Violation",
        description: "Optical profile scanner detected obstacle violating clearance envelope on platform line 3.",
        severity: "Critical"
      },
      {
        title: "Signal Lens Soot Obstruction",
        description: "Optical signal status feedback loops indicate diminished light output, suggesting soot buildup on lenses.",
        severity: "Low"
      },
      {
        title: "Traction Substation Transformer Low Oil",
        description: "Oil conservator level gauge dropped below minimum mark on Transformer T-3.",
        severity: "High"
      },
      {
        title: "Track Vibration Signature Anomaly",
        description: "High frequency vibration detected on bogie accelerometers during train crossing on bridge approach.",
        severity: "Medium"
      },
      {
        title: "Pneumatic Brake Supply Low Pressure",
        description: "Air compressor pressure reservoir registered 4.1 bar (Alert limit is 5 bar) at terminal siding.",
        severity: "High"
      },
      {
        title: "Level Crossing Audio Alarm Failure",
        description: "Audible crossing bell circuit open-fault detected during active gate cycle.",
        severity: "Medium"
      },
      {
        title: "Telemetry Sensor Link Loss",
        description: "Traction motor temperature sensor S-44 failed to report status for 5 consecutive polling cycles.",
        severity: "Low"
      },
      {
        title: "OHE Isolator Switch Sparking",
        description: "Arcing observed on thermal imaging camera during OHE section isolator switch manipulation.",
        severity: "High"
      },
      {
        title: "Axle Counter Wheel Sensor Slip",
        description: "Axle counter wheel sensor WS-02 reported anomalous pulses, indicating loose bracket mounting.",
        severity: "Medium"
      },
      {
        title: "Point Blade Gapping Defect",
        description: "Switch PM-12 closed state has a gap of 4mm between switch rail and stock rail (Safety limit is 2mm).",
        severity: "Critical"
      },
      {
        title: "Substation Protective Relay Lockout",
        description: "Differential protection relay trip initiated lockout state on primary grid feeder circuit.",
        severity: "Critical"
      },
      {
        title: "Bridge Pier Structural Vibration",
        description: "Seismic accelerometers on Bridge 14 Pier 3 registered vibration peak of 9.2 mm/s during express passage.",
        severity: "Critical"
      },
      {
        title: "Traction Substation Gas Pressure Low",
        description: "SF6 insulation gas pressure in main circuit breaker tank fell below 3.5 bar safety threshold.",
        severity: "High"
      },
      {
        title: "Switch Blade Wear Breach",
        description: "Visual inspection logs indicate switch blade profile thickness is below minimum wear index.",
        severity: "Low"
      },
      {
        title: "Unscheduled Power Outage at Terminal",
        description: "Station auxiliary distribution transformer tripped on overcurrent, switching terminal to diesel generator backup.",
        severity: "Medium"
      },
      {
        title: "Telemetry Packet Jitter Alarm",
        description: "Network telemetry link for signal tower registered packet loss exceeding 15% over 10 minutes.",
        severity: "Low"
      },
      {
        title: "Locomotive Bogie Hot Axle Detection",
        description: "Wayside thermal camera flagged box temperature exceeding 96°C on outbound freight express.",
        severity: "Critical"
      },
      {
        title: "Level Crossing Boom Sticking",
        description: "Gate LC-04 took 12 seconds to fully raise, indicating hydraulic fluid leakage or counterweight offset.",
        severity: "Medium"
      },
      {
        title: "OHE Contact Wire Tension High",
        description: "Compensation pulley weight stack reached end-of-travel constraint, risking mechanical overload.",
        severity: "Medium"
      },
      {
        title: "Friction Buffer Stop Displacement",
        description: "Siding friction buffer stop moved 15cm from nominal placement following shunting contact.",
        severity: "Low"
      },
      {
        title: "Track Circuit Ballast Resistance Low",
        description: "Sub-grade drainage blockage caused heavy water logging, degrading ballast resistance on TC-10.",
        severity: "Medium"
      },
      {
        title: "Interlocking Signal Aspect Mismatch",
        description: "Relay logic output and physical signal lamp feedback show mismatch on signal S-21.",
        severity: "Critical"
      },
      {
        title: "Point Machine Overheating",
        description: "Switch machine PM-15 motor winding temperature exceeded 85°C during high traffic period.",
        severity: "Medium"
      },
      {
        title: "Substation Transformer Overload",
        description: "Peak traction load exceeded rated transformer capacity by 15% for a continuous 20 minutes.",
        severity: "High"
      },
      {
        title: "OHE Dropper Wire Breakage",
        description: "Inspection camera detected broken dropper wire between contact and catenary cables at span 22.",
        severity: "High"
      },
      {
        title: "Level Crossing Obstacle Detection Triggered",
        description: "LIDAR scanner at crossing LC-08 detected a stalled vehicle footprint on active tracks.",
        severity: "Critical"
      },
      {
        title: "Axle Counter Direction Discrepancy",
        description: "Block section counter flagged direction mismatch, indicating counting discrepancy or reverse wheel creep.",
        severity: "High"
      },
      {
        title: "Track Expansion Anomaly",
        description: "Continuous Welded Rail (CWR) expansion joint reached maximum expansion limit due to ambient heat.",
        severity: "High"
      },
      {
        title: "Tunnel Ventilation Fan Trip",
        description: "Auxiliary ventilation fan EF-02 in main tunnel tripped due to motor winding phase imbalance.",
        severity: "Medium"
      },
      {
        title: "Signal Cabin Auxiliary Power Down",
        description: "Main utility grid phase failure switched signal cabin logic systems to double-conversion UPS backup.",
        severity: "Medium"
      },
      {
        title: "Point Drive Crank Lock Anomaly",
        description: "Mechanical locking detection switch failed to engage following switch rail repositioning.",
        severity: "Critical"
      },
      {
        title: "Substation Earth Leakage Alarm",
        description: "Neutral ground current sensor registered 4.2 Amps leakage, indicating insulator tracking.",
        severity: "High"
      },
      {
        title: "Traction Motor Overcurrent Anomaly",
        description: "Locomotive traction motor 4 drew 480 Amps during heavy grade start, violating load curve.",
        severity: "Medium"
      },
      {
        title: "OHE Tension Compensator Cable Slip",
        description: "Auto-tensioning device steel wire rope registered minor fraying on compensation pulley.",
        severity: "Low"
      },
      {
        title: "Broken Track Circuit Joint Insulator",
        description: "Insulated rail joint IRJ-14 resistance dropped to 12 Ohms, causing track circuit fault indication.",
        severity: "Critical"
      },
      {
        title: "Fouling Bar Mechanical Bind",
        description: "Switch safety fouling bar failed to fully restore to normal height after wheel passage.",
        severity: "High"
      },
      {
        title: "Level Crossing LED Aspect Failure",
        description: "Red LED traffic warning array at crossing LC-12 has multiple dark cells, reducing visibility.",
        severity: "Low"
      },
      {
        title: "Substation Vacuum Interrupter Leak",
        description: "Vacuum circuit breaker VCB-03 monitoring systems indicate envelope pressure rise.",
        severity: "High"
      },
      {
        title: "Locomotive Braking Resistor Overheat",
        description: "Dynamic braking resistor bank temperature sensor reached 145°C during grade descent.",
        severity: "Medium"
      },
      {
        title: "Catenary Wire Splice Heat Anomaly",
        description: "Thermal imaging inspection flagged 85°C hotspot on contact wire splice segment.",
        severity: "Medium"
      },
      {
        title: "Track Fastener Displacement",
        description: "Concrete sleeper elastic rail clip missing on curve segment 8, track approach siding.",
        severity: "Low"
      },
      {
        title: "Signal Tower Relay Contacts Welded",
        description: "Safety monitoring logic flagged locked contacts on intermediate block signaling relay.",
        severity: "Critical"
      },
      {
        title: "Axle Counter Reset Key Lockout",
        description: "Authorized manual reset key command failed to restore block status, requiring local checkout.",
        severity: "High"
      },
      {
        title: "Point Motor Carbon Brush Wear",
        description: "Direct-current motor diagnostic telemetry warning indicates high commutator sparking index.",
        severity: "Low"
      }
    ];

    const incidentDocs = [];
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
                    (today.getMonth() + 1).toString().padStart(2, '0') +
                    today.getDate().toString().padStart(2, '0');

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const nodeIndex = i % nodes.length;
      const node = nodes[nodeIndex];

      let riskScore = 15;
      if (template.severity === 'Critical') {
        riskScore = 82 + (i % 17);
      } else if (template.severity === 'High') {
        riskScore = 62 + (i % 17);
      } else if (template.severity === 'Medium') {
        riskScore = 32 + (i % 27);
      } else {
        riskScore = 10 + (i % 21);
      }

      const status = statusList[i % statusList.length];
      const assignedTeam = teamList[i % teamList.length];
      const source = sourceList[i % sourceList.length];
      const createdAt = new Date(Date.now() - (i * 3 * 3600 * 1000) - (Math.random() * 2 * 3600 * 1000));
      
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const incidentId = `INC-${dateStr}-${randomPart}-${i}`; // Appending index ensures uniqueness

      incidentDocs.push({
        incidentId,
        nodeId: node._id,
        riskScore,
        severity: template.severity,
        title: template.title,
        description: template.description,
        status,
        assignedTeam,
        source,
        createdAt
      });
    }

    const created = await Incident.insertMany(incidentDocs);
    console.log(`[VANGUARD-DB] Seeded ${created.length} highly realistic incidents.`);
  } catch (error) {
    console.error(`[VANGUARD-DB] Failed to seed incidents: ${error.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[VANGUARD-DB] MongoDB Connected: ${conn.connection.host}`);
    await seedDemoUsers();
    await seedInfrastructure();
    await seedComplianceRules();
    await seedIncidents();
    await routeService.generateRouteSegments();
    await riskService.calculateAllRisks();
    console.log('[VANGUARD-DB] Initial global risk scores calculated.');
  } catch (error) {
    console.error(`[VANGUARD-DB] Error establishing MongoDB Connection: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
