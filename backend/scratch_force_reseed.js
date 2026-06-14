import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import RailwayNode from './src/models/RailwayNode.js';
import RailwayConnection from './src/models/RailwayConnection.js';
import RouteSegment from './src/models/RouteSegment.js';
import RiskScore from './src/models/RiskScore.js';
import ComplianceRule from './src/models/ComplianceRule.js';
import routeService from './src/services/routeService.js';
import riskService from './src/services/riskService.js';
import { generateIndianRailwayNetwork } from './src/config/indianRailwaySeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  console.log("Clearing all infrastructure collections...");
  await RailwayNode.deleteMany({});
  await RailwayConnection.deleteMany({});
  await RiskScore.deleteMany({});
  await RouteSegment.deleteMany({});
  console.log("Cleared.");

  console.log("Generating Indian Railway Network...");
  const { nodes: nodeData, connections: connectionData } = generateIndianRailwayNetwork();
  console.log(`Generated ${nodeData.length} nodes and ${connectionData.length} connections.`);

  console.log("Inserting nodes...");
  const createdNodes = await RailwayNode.insertMany(nodeData);
  console.log(`Inserted ${createdNodes.length} nodes.`);

  const nodeMap = {};
  createdNodes.forEach((node) => {
    nodeMap[node.nodeCode] = node._id;
  });

  console.log("Resolving and inserting connections...");
  const resolvedConnections = connectionData
    .map((conn) => ({
      sourceNode: nodeMap[conn.sourceCode],
      targetNode: nodeMap[conn.targetCode],
      distance: conn.distance,
      status: conn.status
    }))
    .filter((conn) => conn.sourceNode && conn.targetNode);

  const createdConnections = await RailwayConnection.insertMany(resolvedConnections);
  console.log(`Inserted ${createdConnections.length} connections.`);

  console.log("Generating route segments...");
  await routeService.generateRouteSegments();
  
  console.log("Calculating all risks...");
  await riskService.calculateAllRisks();

  const nodeCount = await RailwayNode.countDocuments({});
  const connectionCount = await RailwayConnection.countDocuments({});
  const routeCount = await RouteSegment.countDocuments({});
  
  console.log("Verification - Nodes in DB:", nodeCount);
  console.log("Verification - Connections in DB:", connectionCount);
  console.log("Verification - Routes in DB:", routeCount);

  const populatedRoutes = await RouteSegment.find({}).populate('sourceNode targetNode');
  let nullSourceOrTarget = 0;
  for (const r of populatedRoutes) {
    if (!r.sourceNode || !r.targetNode) {
      nullSourceOrTarget++;
    }
  }
  console.log("Verification - Routes with null source/target:", nullSourceOrTarget);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch(console.error);
