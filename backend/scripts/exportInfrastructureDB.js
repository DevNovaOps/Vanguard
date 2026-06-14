/**
 * ============================================================
 * Vanguard ARC — Infrastructure Database Export Script
 * ============================================================
 * 
 * Reads ALL documents from the MongoDB "railwaystations" collection,
 * joins connection data from the seed file, validates integrity,
 * and outputs a transformed infrastructure-db.json file.
 * 
 * Usage:
 *   npm run export:infrastructure
 *   node scripts/exportInfrastructureDB.js
 * 
 * Output:
 *   exports/infrastructure-db.json
 * ============================================================
 */

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Path Setup ──────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });

// ── Configuration ───────────────────────────────────────────
const CHUNK_SIZE = 500;
const SEED_FILE = path.resolve(ROOT_DIR, 'stations_7300.json');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'exports');
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, 'infrastructure-db.json');

// ── Logger ──────────────────────────────────────────────────
const log = {
  info: (msg) => console.log(`[EXPORT] ${msg}`),
  warn: (msg) => console.warn(`[EXPORT-WARN] ${msg}`),
  error: (msg) => console.error(`[EXPORT-ERROR] ${msg}`),
  success: (msg) => console.log(`[EXPORT-OK] ✓ ${msg}`),
  divider: () => console.log('─'.repeat(60)),
};

// ── Build Connection Map from Seed File ─────────────────────
function buildConnectionMap() {
  log.info('Loading connection graph from seed file...');

  if (!fs.existsSync(SEED_FILE)) {
    log.warn(`Seed file not found at ${SEED_FILE}. Connections will be empty.`);
    return new Map();
  }

  const raw = fs.readFileSync(SEED_FILE, 'utf8');
  const seedStations = JSON.parse(raw);
  const connectionMap = new Map();

  for (const station of seedStations) {
    if (station.stationCode && Array.isArray(station.connections)) {
      connectionMap.set(station.stationCode, station.connections.map(c => ({
        stationCode: c.stationCode,
        distanceKm: c.distanceKm,
        travelTime: c.travelTime
      })));
    }
  }

  log.info(`Loaded connection graph for ${connectionMap.size} stations from seed file.`);
  return connectionMap;
}

// ── Transform Station Document ──────────────────────────────
function transformStation(doc, connectionMap, allStationCodes) {
  const connections = (connectionMap.get(doc.stationCode) || []).map(c => ({
    targetCode: c.stationCode,
    distanceKm: c.distanceKm,
    travelTimeMinutes: c.travelTime
  }));

  // Build metadata from all remaining/extra fields
  const metadata = {};

  if (doc.amenities && doc.amenities.length > 0) {
    metadata.amenities = doc.amenities;
  }
  if (doc.location) {
    metadata.geoJson = doc.location;
  }
  if (doc.__v !== undefined) {
    metadata.schemaVersion = doc.__v;
  }

  // Capture any extra fields not in the standard mapping
  const knownFields = new Set([
    '_id', 'stationCode', 'stationName', 'state', 'zone', 'division',
    'latitude', 'longitude', 'amenities', 'location', 'createdAt',
    'updatedAt', '__v'
  ]);
  for (const [key, value] of Object.entries(doc)) {
    if (!knownFields.has(key)) {
      metadata[key] = value;
    }
  }

  return {
    id: doc._id.toString(),
    code: doc.stationCode || '',
    name: doc.stationName || '',
    type: 'station',
    location: {
      lat: doc.latitude || 0,
      lng: doc.longitude || 0
    },
    zone: doc.zone || '',
    division: doc.division || '',
    state: doc.state || '',
    platforms: doc.platforms || 0,
    status: doc.status || 'active',
    connections: connections,
    metadata: Object.keys(metadata).length > 0 ? metadata : {},
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null
  };
}

// ── Validation ──────────────────────────────────────────────
function validateExport(stations) {
  log.divider();
  log.info('Running validation checks...');

  const stats = {
    totalStations: stations.length,
    totalConnections: 0,
    missingCoordinates: 0,
    duplicateStationCodes: 0,
    invalidReferences: 0,
    stationsByZone: {},
    stationsByState: {},
  };

  const codeSet = new Map();
  const allCodes = new Set(stations.map(s => s.code));

  for (const station of stations) {
    // Count connections
    stats.totalConnections += station.connections.length;

    // Check missing coordinates
    if (!station.location.lat || !station.location.lng) {
      stats.missingCoordinates++;
    }

    // Check duplicate codes
    if (codeSet.has(station.code)) {
      stats.duplicateStationCodes++;
      log.warn(`Duplicate station code: ${station.code} (IDs: ${codeSet.get(station.code)}, ${station.id})`);
    } else {
      codeSet.set(station.code, station.id);
    }

    // Check invalid connection references
    for (const conn of station.connections) {
      if (!allCodes.has(conn.targetCode)) {
        stats.invalidReferences++;
      }
    }

    // Zone and state distribution
    if (station.zone) {
      stats.stationsByZone[station.zone] = (stats.stationsByZone[station.zone] || 0) + 1;
    }
    if (station.state) {
      stats.stationsByState[station.state] = (stats.stationsByState[station.state] || 0) + 1;
    }
  }

  return stats;
}

// ── Main Export Pipeline ────────────────────────────────────
async function main() {
  const startTime = Date.now();

  log.divider();
  log.info('Vanguard ARC — Infrastructure Database Export');
  log.divider();

  // 1. Connect to MongoDB
  log.info('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  log.success('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const collection = db.collection('railwaystations');

  // 2. Get total count
  const totalCount = await collection.countDocuments({});
  log.info(`Found ${totalCount} stations in "railwaystations" collection.`);

  if (totalCount === 0) {
    log.error('No stations found. Aborting export.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 3. Build connection map from seed file
  const connectionMap = buildConnectionMap();

  // 4. Stream/chunk process all stations
  log.divider();
  log.info(`Processing stations in chunks of ${CHUNK_SIZE}...`);

  const allStations = [];
  let processed = 0;

  const cursor = collection.find({}).batchSize(CHUNK_SIZE);

  const allDocs = [];
  for await (const doc of cursor) {
    allDocs.push(doc);
  }

  // Build set of all station codes for reference validation
  const allStationCodes = new Set(allDocs.map(d => d.stationCode));

  // Transform in chunks
  for (let i = 0; i < allDocs.length; i += CHUNK_SIZE) {
    const chunk = allDocs.slice(i, i + CHUNK_SIZE);

    for (const doc of chunk) {
      const transformed = transformStation(doc, connectionMap, allStationCodes);
      allStations.push(transformed);
    }

    processed += chunk.length;
    log.info(`Exported ${processed}/${totalCount} stations...`);
  }

  // 5. Validate
  const stats = validateExport(allStations);

  // 6. Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    log.info(`Created output directory: ${OUTPUT_DIR}`);
  }

  // 7. Write output file
  log.divider();
  log.info('Writing infrastructure-db.json...');

  const output = {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      source: 'railwaystations',
      version: '1.0.0',
      platform: 'Vanguard ARC Railway Intelligence',
      totalRecords: allStations.length
    },
    statistics: stats,
    stations: allStations
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  const fileSizeBytes = fs.statSync(OUTPUT_FILE).size;
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

  // 8. Print summary report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  log.divider();
  log.success('EXPORT COMPLETED SUCCESSFULLY');
  log.divider();
  console.log('');
  console.log('  ┌──────────────────────────────────────────────┐');
  console.log('  │        INFRASTRUCTURE EXPORT SUMMARY         │');
  console.log('  ├──────────────────────────────────────────────┤');
  console.log(`  │  Total Stations       : ${String(stats.totalStations).padStart(8)}           │`);
  console.log(`  │  Total Connections     : ${String(stats.totalConnections).padStart(8)}           │`);
  console.log(`  │  Missing Coordinates  : ${String(stats.missingCoordinates).padStart(8)}           │`);
  console.log(`  │  Duplicate Codes      : ${String(stats.duplicateStationCodes).padStart(8)}           │`);
  console.log(`  │  Invalid References   : ${String(stats.invalidReferences).padStart(8)}           │`);
  console.log('  ├──────────────────────────────────────────────┤');
  console.log(`  │  Output File          : infrastructure-db.json       │`);
  console.log(`  │  File Size            : ${String(fileSizeMB + ' MB').padStart(12)}       │`);
  console.log(`  │  Time Elapsed         : ${String(elapsed + 's').padStart(10)}         │`);
  console.log('  └──────────────────────────────────────────────┘');
  console.log('');

  // Zone breakdown
  console.log('  Zone Distribution:');
  const sortedZones = Object.entries(stats.stationsByZone).sort((a, b) => b[1] - a[1]);
  for (const [zone, count] of sortedZones) {
    console.log(`    ${zone.padEnd(25)} ${count}`);
  }
  console.log('');

  // State breakdown (top 10)
  console.log('  State Distribution (Top 10):');
  const sortedStates = Object.entries(stats.stationsByState).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [state, count] of sortedStates) {
    console.log(`    ${state.padEnd(25)} ${count}`);
  }
  console.log('');

  log.info(`Output saved to: ${OUTPUT_FILE}`);

  // 9. Disconnect
  await mongoose.disconnect();
  log.success('Disconnected from MongoDB. Export pipeline finished.');
}

main().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
