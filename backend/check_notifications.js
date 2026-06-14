import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './src/models/Notification.js';
import dns from 'dns';

// Setup DNS servers to Google DNS for reliable SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4']);

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const all = await Notification.find({ type: 'SimulationCompleted' });
  console.log("SimulationCompleted notifications:", JSON.stringify(all, null, 2));

  await mongoose.connection.close();
}

run().catch(console.error);
