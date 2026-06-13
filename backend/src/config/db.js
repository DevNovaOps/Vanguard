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
    // Clear old data to transition to geographical nodes
    await RailwayNode.deleteMany({});
    await RailwayConnection.deleteMany({});
    await RiskScore.deleteMany({});
    await RouteSegment.deleteMany({});
    console.log('[VANGUARD-DB] Cleared old infrastructure collections.');

    console.log('[VANGUARD-DB] Seeding Geographical Railway Nodes...');
    const nodeData = [
      { nodeCode: 'DLI', nodeName: 'Delhi Junction', nodeType: 'Junction', latitude: 28.6613, longitude: 77.2299, status: 'healthy', region: 'Northern' },
      { nodeCode: 'GGN', nodeName: 'Gurugram', nodeType: 'Station', latitude: 28.4682, longitude: 77.0195, status: 'healthy', region: 'Northern' },
      { nodeCode: 'JP', nodeName: 'Jaipur Junction', nodeType: 'Junction', latitude: 26.9196, longitude: 75.7878, status: 'healthy', region: 'North Western' },
      { nodeCode: 'AII', nodeName: 'Ajmer Junction', nodeType: 'Junction', latitude: 26.4561, longitude: 74.6295, status: 'healthy', region: 'North Western' },
      { nodeCode: 'MJ', nodeName: 'Marwar Junction', nodeType: 'Junction', latitude: 25.7335, longitude: 73.6146, status: 'healthy', region: 'North Western' },
      { nodeCode: 'ABR', nodeName: 'Abu Road', nodeType: 'Station', latitude: 24.4754, longitude: 72.7753, status: 'healthy', region: 'North Western' },
      { nodeCode: 'PNU', nodeName: 'Palanpur Junction', nodeType: 'Junction', latitude: 24.1728, longitude: 72.4226, status: 'healthy', region: 'Western' },
      { nodeCode: 'MSH', nodeName: 'Mahesana Junction', nodeType: 'Junction', latitude: 23.6022, longitude: 72.3995, status: 'healthy', region: 'Western' },
      { nodeCode: 'ADI', nodeName: 'Ahmedabad Junction', nodeType: 'Junction', latitude: 23.0276, longitude: 72.6002, status: 'healthy', region: 'Western' },
      { nodeCode: 'ND', nodeName: 'Nadiad Junction', nodeType: 'Junction', latitude: 22.6916, longitude: 72.8634, status: 'healthy', region: 'Western' },
      { nodeCode: 'ANND', nodeName: 'Anand Junction', nodeType: 'Junction', latitude: 22.5560, longitude: 72.9649, status: 'healthy', region: 'Western' },
      { nodeCode: 'BRC', nodeName: 'Vadodara Junction', nodeType: 'Junction', latitude: 22.3129, longitude: 73.1812, status: 'warning', region: 'Western' },
      { nodeCode: 'BH', nodeName: 'Bharuch Junction', nodeType: 'Junction', latitude: 21.7051, longitude: 72.9941, status: 'healthy', region: 'Western' },
      { nodeCode: 'ST', nodeName: 'Surat Station', nodeType: 'Station', latitude: 21.2044, longitude: 72.8406, status: 'healthy', region: 'Western' },
      { nodeCode: 'NVS', nodeName: 'Navsari', nodeType: 'Station', latitude: 20.9496, longitude: 72.9392, status: 'healthy', region: 'Western' },
      { nodeCode: 'BL', nodeName: 'Valsad', nodeType: 'Station', latitude: 20.6101, longitude: 72.9262, status: 'healthy', region: 'Western' },
      { nodeCode: 'VAPI', nodeName: 'Vapi', nodeType: 'Station', latitude: 20.3752, longitude: 72.9132, status: 'healthy', region: 'Western' },
      { nodeCode: 'PLG', nodeName: 'Palghar', nodeType: 'Station', latitude: 19.6979, longitude: 72.7665, status: 'healthy', region: 'Western' },
      { nodeCode: 'MMCT', nodeName: 'Mumbai Central', nodeType: 'Station', latitude: 18.9712, longitude: 72.8194, status: 'healthy', region: 'Western' }
    ];

    const createdNodes = await RailwayNode.insertMany(nodeData);
    console.log(`[VANGUARD-DB] Seeded ${createdNodes.length} geographical nodes.`);

    // Map nodeCode to ObjectId
    const nodeMap = {};
    createdNodes.forEach(node => {
      nodeMap[node.nodeCode] = node._id;
    });

    console.log('[VANGUARD-DB] Seeding Geographical Connections...');
    const connectionData = [
      { sourceNode: nodeMap['DLI'], targetNode: nodeMap['GGN'], distance: 30, status: 'Active' },
      { sourceNode: nodeMap['GGN'], targetNode: nodeMap['JP'], distance: 270, status: 'Active' },
      { sourceNode: nodeMap['JP'], targetNode: nodeMap['AII'], distance: 135, status: 'Active' },
      { sourceNode: nodeMap['AII'], targetNode: nodeMap['MJ'], distance: 140, status: 'Active' },
      { sourceNode: nodeMap['MJ'], targetNode: nodeMap['ABR'], distance: 125, status: 'Active' },
      { sourceNode: nodeMap['ABR'], targetNode: nodeMap['PNU'], distance: 50, status: 'Active' },
      { sourceNode: nodeMap['PNU'], targetNode: nodeMap['MSH'], distance: 65, status: 'Active' },
      { sourceNode: nodeMap['MSH'], targetNode: nodeMap['ADI'], distance: 70, status: 'Active' },
      { sourceNode: nodeMap['ADI'], targetNode: nodeMap['ND'], distance: 45, status: 'Active' },
      { sourceNode: nodeMap['ND'], targetNode: nodeMap['ANND'], distance: 20, status: 'Active' },
      { sourceNode: nodeMap['ANND'], targetNode: nodeMap['BRC'], distance: 35, status: 'Active' },
      { sourceNode: nodeMap['BRC'], targetNode: nodeMap['BH'], distance: 70, status: 'warning' },
      { sourceNode: nodeMap['BH'], targetNode: nodeMap['ST'], distance: 60, status: 'Active' },
      { sourceNode: nodeMap['ST'], targetNode: nodeMap['NVS'], distance: 30, status: 'Active' },
      { sourceNode: nodeMap['NVS'], targetNode: nodeMap['BL'], distance: 40, status: 'Active' },
      { sourceNode: nodeMap['BL'], targetNode: nodeMap['VAPI'], distance: 25, status: 'Active' },
      { sourceNode: nodeMap['VAPI'], targetNode: nodeMap['PLG'], distance: 95, status: 'Active' },
      { sourceNode: nodeMap['PLG'], targetNode: nodeMap['MMCT'], distance: 85, status: 'Active' }
    ];

    const createdConnections = await RailwayConnection.insertMany(connectionData);
    console.log(`[VANGUARD-DB] Seeded ${createdConnections.length} geographical connections.`);
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
