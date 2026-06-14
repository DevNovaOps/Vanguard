import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load backend env
dotenv.config();

import AgentAction from './src/models/AgentAction.js';
import SimulationResult from './src/models/SimulationResult.js';

import User from './src/models/User.js';

async function main() {
  console.log("Connecting to:", process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");

  const users = await User.find({});
  console.log("\n=== ALL REGISTERED USERS ===");
  for (const u of users) {
    console.log(`Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
