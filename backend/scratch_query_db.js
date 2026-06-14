import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load backend env
dotenv.config();

import AgentAction from './src/models/AgentAction.js';
import SimulationResult from './src/models/SimulationResult.js';

async function main() {
  console.log("Connecting to:", process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");

  console.log("\n=== LATEST AGENT ACTIONS ===");
  const actions = await AgentAction.find({}).sort({ createdAt: -1 }).limit(3);
  for (const act of actions) {
    console.log(`Action ID: ${act._id}`);
    console.log(`Decision: ${act.decision}`);
    console.log(`Severity: ${act.severity}`);
    console.log(`Reasoning: ${act.reasoning}`);
    console.log(`Telemetry:`, act.telemetryData);
    console.log("--------------------------------");
  }

  console.log("\n=== LATEST SIMULATION RESULTS ===");
  const simResults = await SimulationResult.find({}).sort({ createdAt: -1 }).limit(3);
  for (const sim of simResults) {
    console.log(`Sim ID: ${sim.simulation_id}`);
    console.log(`Risk Level: ${sim.risk_level}`);
    console.log(`Executive Summary: ${sim.executive_summary?.slice(0, 150)}...`);
    console.log(`Root Causes: ${sim.root_causes?.slice(0, 150)}...`);
    console.log(`Retrieval Results: ${sim.retrieval_results?.slice(0, 150)}...`);
    console.log("--------------------------------");
  }

  await mongoose.disconnect();
}

main().catch(console.error);
