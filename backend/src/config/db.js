import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User.js';
import RailwayNode from '../models/RailwayNode.js';
import RailwayConnection from '../models/RailwayConnection.js';
import ComplianceRule from '../models/ComplianceRule.js';
import RiskScore from '../models/RiskScore.js';
import RouteSegment from '../models/RouteSegment.js';
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
    const existingCount = await RailwayNode.countDocuments({});
    if (existingCount >= 1000) {
      console.log(`[VANGUARD-DB] Infrastructure already seeded (${existingCount} nodes). Skipping re-seed.`);
      return;
    }

    await RailwayNode.deleteMany({});
    await RailwayConnection.deleteMany({});
    await RiskScore.deleteMany({});
    await RouteSegment.deleteMany({});
    console.log('[VANGUARD-DB] Cleared old infrastructure collections.');

    console.log('[VANGUARD-DB] Seeding Indian Railway Network (1200+ nodes)...');
    const { nodes: nodeData, connections: connectionData } = generateIndianRailwayNetwork();

    const createdNodes = await RailwayNode.insertMany(nodeData);
    console.log(`[VANGUARD-DB] Seeded ${createdNodes.length} railway nodes.`);

    const nodeMap = {};
    createdNodes.forEach((node) => {
      nodeMap[node.nodeCode] = node._id;
    });

    const resolvedConnections = connectionData
      .map((conn) => ({
        sourceNode: nodeMap[conn.sourceCode],
        targetNode: nodeMap[conn.targetCode],
        distance: conn.distance,
        status: conn.status
      }))
      .filter((conn) => conn.sourceNode && conn.targetNode);

    const createdConnections = await RailwayConnection.insertMany(resolvedConnections);
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

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[VANGUARD-DB] MongoDB Connected: ${conn.connection.host}`);
    await seedDemoUsers();
    await seedInfrastructure();
    await seedComplianceRules();
    await routeService.generateRouteSegments();
    await riskService.calculateAllRisks();
    console.log('[VANGUARD-DB] Initial global risk scores calculated.');
  } catch (error) {
    console.error(`[VANGUARD-DB] Error establishing MongoDB Connection: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
