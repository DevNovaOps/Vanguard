import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import RailwayNode from './src/models/RailwayNode.js';
import RailwayConnection from './src/models/RailwayConnection.js';
import RouteSegment from './src/models/RouteSegment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");
  
  const routes = await RouteSegment.find({});
  console.log("Total routes in DB:", routes.length);
  
  const populatedRoutes = await RouteSegment.find({}).populate('sourceNode targetNode');
  let nullSourceOrTarget = 0;
  for (const r of populatedRoutes) {
    if (!r.sourceNode || !r.targetNode) {
      nullSourceOrTarget++;
    }
  }
  console.log("Routes with null sourceNode or targetNode after populate:", nullSourceOrTarget);
  
  // Let's print one of the routes with null endpoints
  const sampleNull = populatedRoutes.find(r => !r.sourceNode || !r.targetNode);
  if (sampleNull) {
    console.log("Sample null route raw:", await RouteSegment.findById(sampleNull._id));
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
