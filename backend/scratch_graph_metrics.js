import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import RailwayNode from './src/models/RailwayNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const nodes = await RailwayNode.find({});
  const ghy = nodes.find(n => n.nodeName.includes("Guwahati"));
  const nonNE = nodes.filter(n => n.region !== "North East");
  
  let minDistance = Infinity;
  let closestNode = null;
  
  nonNE.forEach(n => {
    const dist = haversineKm(ghy.latitude, ghy.longitude, n.latitude, n.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestNode = n;
    }
  });
  
  console.log(`Guwahati is: ${ghy.latitude}, ${ghy.longitude}`);
  console.log(`Closest non-NE node is ${closestNode.nodeName} (${closestNode.nodeCode}) at ${closestNode.latitude}, ${closestNode.longitude} with distance ${minDistance.toFixed(1)} km`);
  
  await mongoose.disconnect();
}

run().catch(console.error);
