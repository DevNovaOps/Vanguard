import React, { useMemo } from 'react';
import { useGLTF, Clone, Box, Cylinder, Sphere, Instances, Instance } from '@react-three/drei';
import { useModelBounds } from './digitalTwinUtils';
import { useDigitalTwin } from './DigitalTwinContext';
import { MAP_PRESETS } from './MapPresets';
import AnimatedRiver from './AnimatedRiver';
import RailwayCrossing from './RailwayCrossing';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// COMPACT WORLD ZONES — Every map uses this same layout (~2400 units)
// ═══════════════════════════════════════════════════════════════════
export const WORLD_ZONES = {
  STATION_X:      500,
  PARKING_X:      680,
  MAINTENANCE_X:  350,
  TRANSFORMER_X:  150,
  JUNCTION_1_X:   0,
  EMERGENCY_X:    -100,
  CROSSING_X:     -280,
  FOREST_X:       -500,
  BRIDGE_X:       -800,
  MOUNTAIN_X:     -1050,
  TUNNEL_X:       -1250,
  JUNCTION_2_X:   -1550,
  FREIGHT_X:      -1750,
};

// ═══════════════════════════════════════════════════════════════════
// INSTANCED TREES — Scattered vegetation, density controlled per map
// ═══════════════════════════════════════════════════════════════════
const TreeInstances = React.memo(function TreeInstances({ positions, trunkColor, canopyColor }) {
  if (positions.length === 0) return null;
  return (
    <group>
      <Instances limit={2000} range={positions.length} castShadow frustumCulled>
        <cylinderGeometry args={[0.15, 0.25, 2]} />
        <meshStandardMaterial color={trunkColor} roughness={1} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + p.scale, p.z]} scale={p.scale} />
        ))}
      </Instances>
      <Instances limit={2000} range={positions.length} castShadow frustumCulled>
        <sphereGeometry args={[1.2, 8, 6]} />
        <meshStandardMaterial color={canopyColor} roughness={0.9} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 2.5 * p.scale, p.z]} scale={p.scale} />
        ))}
      </Instances>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// INSTANCED OHE POLES + OVERHEAD WIRES
// ═══════════════════════════════════════════════════════════════════
const PoleInstances = React.memo(function PoleInstances({ positions }) {
  if (positions.length === 0) return null;
  return (
    <group>
      {/* Poles */}
      <Instances limit={500} range={positions.length} castShadow frustumCulled>
        <cylinderGeometry args={[0.15, 0.2, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 6, p.z]} />
        ))}
      </Instances>
      {/* Cross-arms */}
      <Instances limit={500} range={positions.length} castShadow frustumCulled>
        <boxGeometry args={[8, 0.15, 0.15]} />
        <meshStandardMaterial color="#475569" metalness={0.5} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 11.5, p.z]} />
        ))}
      </Instances>
      {/* Wires */}
      <Instances limit={1000} range={positions.length * 2} frustumCulled>
        <boxGeometry args={[0.05, 0.05, 30]} />
        <meshStandardMaterial color="#1e293b" />
        {positions.map((p, i) => (
          <Instance key={i * 2} position={[p.x - 3, p.y + 11.5, p.z + 15]} />
        ))}
        {positions.map((p, i) => (
          <Instance key={i * 2 + 1} position={[p.x + 3, p.y + 11.5, p.z + 15]} />
        ))}
      </Instances>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// SIGNAL LIGHT
// ═══════════════════════════════════════════════════════════════════
const SignalLight = React.memo(function SignalLight({ position, color = 'green' }) {
  const lightColor = color === 'red' ? '#ef4444' : color === 'yellow' ? '#f59e0b' : '#22c55e';
  return (
    <group position={position}>
      <Cylinder args={[0.1, 0.12, 8]} position={[0, 4, 0]} castShadow>
        <meshStandardMaterial color="#334155" />
      </Cylinder>
      <Box args={[0.6, 1.5, 0.4]} position={[0, 8.5, 0]} castShadow>
        <meshStandardMaterial color="#0f172a" />
      </Box>
      <Sphere args={[0.2, 8, 8]} position={[0, 9, 0.25]}>
        <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={2} />
      </Sphere>
      <pointLight position={[0, 9, 0.5]} color={lightColor} intensity={1} distance={15} />
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// OVAL TUNNEL — Tube through mountain
// ═══════════════════════════════════════════════════════════════════
const OvalTunnel = React.memo(function OvalTunnel({ position, trackZ, railHeight, rockColor, wallColor }) {
  const curve = useMemo(() => {
    return new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(400, 0, 0));
  }, []);

  return (
    <group position={position}>
      {/* Tunnel bore */}
      <mesh position={[200, railHeight - 2, trackZ]} castShadow receiveShadow>
        <tubeGeometry args={[curve, 20, 16, 16, false]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Mountain covering */}
      <mesh position={[200, railHeight + 5, trackZ]} rotation={[0, 0, Math.PI / 2]} receiveShadow castShadow>
        <cylinderGeometry args={[25, 30, 400, 8, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={rockColor} roughness={1} />
      </mesh>
      {/* Tunnel portals (arches at both ends) */}
      {[0, 400].map(x => (
        <mesh key={x} position={[x, railHeight + 5, trackZ]} rotation={[0, x === 0 ? Math.PI / 2 : -Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[16, 16, 2, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={wallColor} roughness={0.8} />
        </mesh>
      ))}
      {/* Internal lighting */}
      <pointLight position={[100, railHeight + 8, trackZ]} color="#fef3c7" intensity={0.5} distance={80} />
      <pointLight position={[200, railHeight + 8, trackZ]} color="#fef3c7" intensity={0.5} distance={80} />
      <pointLight position={[300, railHeight + 8, trackZ]} color="#fef3c7" intensity={0.5} distance={80} />
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// INSTANCED LAMP POSTS — Station and road lighting
// ═══════════════════════════════════════════════════════════════════
const LampPostInstances = React.memo(function LampPostInstances({ positions, postColor, glowColor, intensity }) {
  if (positions.length === 0) return null;
  return (
    <group>
      <Instances limit={200} range={positions.length} castShadow frustumCulled>
        <cylinderGeometry args={[0.08, 0.12, 8]} />
        <meshStandardMaterial color={postColor} metalness={0.6} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 4, p.z]} />
        ))}
      </Instances>
      <Instances limit={200} range={positions.length} frustumCulled>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={intensity} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 8.2, p.z]} />
        ))}
      </Instances>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// INSTANCED VEHICLES — Cars and trucks on roads
// ═══════════════════════════════════════════════════════════════════
const VehicleInstances = React.memo(function VehicleInstances({ cars, trucks }) {
  return (
    <group>
      {/* Car bodies */}
      {cars.length > 0 && (
        <Instances limit={100} range={cars.length} castShadow frustumCulled>
          <boxGeometry args={[4, 1.5, 2]} />
          <meshStandardMaterial roughness={0.4} metalness={0.3} />
          {cars.map((c, i) => (
            <Instance key={i} position={c.pos} color={c.color} />
          ))}
        </Instances>
      )}
      {/* Car cabins */}
      {cars.length > 0 && (
        <Instances limit={100} range={cars.length} castShadow frustumCulled>
          <boxGeometry args={[2, 1, 1.8]} />
          <meshStandardMaterial roughness={0.3} metalness={0.2} />
          {cars.map((c, i) => (
            <Instance key={i} position={[c.pos[0] - 0.5, c.pos[1] + 1.2, c.pos[2]]} color={c.color} />
          ))}
        </Instances>
      )}
      {/* Trucks */}
      {trucks.length > 0 && (
        <Instances limit={50} range={trucks.length} castShadow frustumCulled>
          <boxGeometry args={[8, 3, 2.5]} />
          <meshStandardMaterial roughness={0.6} metalness={0.2} />
          {trucks.map((t, i) => (
            <Instance key={i} position={t.pos} color={t.color} />
          ))}
        </Instances>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// INSTANCED CCTV CAMERAS
// ═══════════════════════════════════════════════════════════════════
const CCTVInstances = React.memo(function CCTVInstances({ positions }) {
  if (positions.length === 0) return null;
  return (
    <group>
      {/* Mount pole */}
      <Instances limit={50} range={positions.length} castShadow frustumCulled>
        <cylinderGeometry args={[0.06, 0.08, 2]} />
        <meshStandardMaterial color="#475569" metalness={0.5} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], p[1] + 1, p[2]]} />
        ))}
      </Instances>
      {/* Camera body */}
      <Instances limit={50} range={positions.length} castShadow frustumCulled>
        <boxGeometry args={[0.4, 0.3, 0.6]} />
        <meshStandardMaterial color="#1e293b" metalness={0.4} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], p[1] + 2.2, p[2]]} />
        ))}
      </Instances>
      {/* Lens (small sphere) */}
      <Instances limit={50} range={positions.length} frustumCulled>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.5} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], p[1] + 2.2, p[2] + 0.35]} />
        ))}
      </Instances>
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// MAIN ENVIRONMENT COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function EnvironmentAssets({ trackZ, railHeight, trackSizeX }) {
  const { activeMap } = useDigitalTwin();
  const mc = MAP_PRESETS[activeMap] || MAP_PRESETS.sunny;

  const cityGltf = useGLTF('/city.glb');
  const city = useModelBounds(cityGltf, 300, [0, 0, 0]);

  const {
    STATION_X, PARKING_X, MAINTENANCE_X, TRANSFORMER_X, JUNCTION_1_X,
    EMERGENCY_X, CROSSING_X, FOREST_X, BRIDGE_X, MOUNTAIN_X,
    TUNNEL_X, JUNCTION_2_X, FREIGHT_X
  } = WORLD_ZONES;

  // ── Pre-compute instanced positions (only recompute when map density changes) ──
  const { treePositions, polePositions, lampPositions, cctvPositions, carData, truckData } = useMemo(() => {
    const seed = (n) => { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
    const rng = seed(42);

    // ── Trees ──
    const treeDensity = mc.trees.density;
    const treeCount = Math.min(1500, Math.floor(350 * treeDensity));
    const trees = [];
    for (let i = 0; i < treeCount; i++) {
      const x = (rng() - 0.5) * 3000 + (STATION_X + FREIGHT_X) / 2;
      const zOffset = rng() > 0.5 ? 30 + rng() * 120 : -30 - rng() * 120;
      trees.push({ x, y: railHeight - 5, z: trackZ + zOffset, scale: 1 + rng() * 2 });
    }
    // Dense forest cluster near FOREST_X
    const forestExtra = Math.min(500, Math.floor(150 * treeDensity));
    for (let i = 0; i < forestExtra; i++) {
      const x = FOREST_X + (rng() - 0.5) * 300;
      const zOffset = rng() > 0.5 ? 18 + rng() * 80 : -18 - rng() * 80;
      trees.push({ x, y: railHeight - 5, z: trackZ + zOffset, scale: 1.5 + rng() * 2.5 });
    }

    // ── OHE Poles ── (every 40 units along the track)
    const poles = [];
    for (let x = FREIGHT_X - 200; x <= STATION_X + 300; x += 40) {
      poles.push({ x, y: railHeight, z: trackZ + 6 });
    }

    // ── Lamp Posts ── (station area + road intersections)
    const lamps = [];
    for (let i = 0; i < 12; i++) {
      lamps.push({ x: STATION_X - 80 + i * 15, y: railHeight, z: trackZ - 16 });
      lamps.push({ x: STATION_X - 80 + i * 15, y: railHeight, z: trackZ + 22 });
    }
    // Crossing area
    lamps.push({ x: CROSSING_X - 15, y: railHeight, z: trackZ - 25 });
    lamps.push({ x: CROSSING_X + 15, y: railHeight, z: trackZ + 25 });
    // Freight area
    for (let i = 0; i < 4; i++) {
      lamps.push({ x: FREIGHT_X - 100 + i * 60, y: railHeight, z: trackZ + 30 });
    }

    // ── CCTV Cameras ──
    const cctvs = [
      [STATION_X, railHeight + 8, trackZ - 14],
      [STATION_X - 60, railHeight + 8, trackZ + 20],
      [STATION_X + 40, railHeight + 8, trackZ - 14],
      [CROSSING_X, railHeight + 10, trackZ - 22],
      [CROSSING_X, railHeight + 10, trackZ + 22],
      [JUNCTION_1_X, railHeight + 10, trackZ + 8],
      [BRIDGE_X + 100, railHeight + 5, trackZ + 8],
      [TUNNEL_X + 450, railHeight + 10, trackZ + 8],
      [FREIGHT_X + 50, railHeight + 8, trackZ + 25],
      [TRANSFORMER_X, railHeight + 8, trackZ - 35],
    ];

    // ── Vehicles ──
    const carColors = mc.vehicles.carColors;
    const cars = [];
    const trucks = [];
    // Parked at station parking
    for (let i = 0; i < 15; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      cars.push({
        pos: [PARKING_X + col * 6, railHeight - 4.2, trackZ - 40 - row * 4],
        color: carColors[i % carColors.length]
      });
    }
    // On road near crossing
    for (let i = 0; i < 6; i++) {
      cars.push({
        pos: [CROSSING_X + (rng() - 0.5) * 10, railHeight - 4.2, trackZ - 30 - i * 5],
        color: carColors[Math.floor(rng() * carColors.length)]
      });
    }
    // Trucks at freight
    for (let i = 0; i < 4; i++) {
      trucks.push({
        pos: [FREIGHT_X - 50 + i * 25, railHeight - 3.5, trackZ + 35],
        color: mc.vehicles.truckColor
      });
    }

    return {
      treePositions: trees,
      polePositions: poles,
      lampPositions: lamps,
      cctvPositions: cctvs,
      carData: cars,
      truckData: trucks,
    };
  }, [railHeight, trackZ, mc.trees.density, mc.vehicles.carColors, mc.vehicles.truckColor,
      STATION_X, PARKING_X, CROSSING_X, JUNCTION_1_X, BRIDGE_X, TUNNEL_X, FREIGHT_X, TRANSFORMER_X, FOREST_X]);

  return (
    <group>
      {/* ═════════════════════════════════════════════
          TERRAIN — Single large ground plane per map
      ═════════════════════════════════════════════ */}
      <mesh position={[-500, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color={mc.terrain.color} roughness={mc.terrain.roughness} />
      </mesh>
      {/* Distant ground */}
      <mesh position={[-500, -5.5, -800]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8000, 3000]} />
        <meshStandardMaterial color={mc.ground.farColor} roughness={1} />
      </mesh>

      {/* ═════════════════════════════════════════════
          BACKGROUND CITY
      ═════════════════════════════════════════════ */}
      {city && (
        <group position={[0, -2, trackZ - 300]}>
          <Clone object={city.scene} position={[STATION_X - 100, 0, 0]} castShadow receiveShadow frustumCulled />
          <Clone object={city.scene} position={[JUNCTION_1_X - 200, 0, -80]} castShadow receiveShadow frustumCulled />
        </group>
      )}

      {/* ═════════════════════════════════════════════
          INSTANCED ASSETS
      ═════════════════════════════════════════════ */}
      <TreeInstances positions={treePositions} trunkColor={mc.trees.trunkColor} canopyColor={mc.trees.canopyColor} />
      <PoleInstances positions={polePositions} />
      <LampPostInstances positions={lampPositions} postColor={mc.lighting.postColor} glowColor={mc.lighting.glowColor} intensity={mc.lighting.intensity} />
      <VehicleInstances cars={carData} trucks={truckData} />
      <CCTVInstances positions={cctvPositions} />

      {/* ═════════════════════════════════════════════
          SIGNAL LIGHTS — At key positions
      ═════════════════════════════════════════════ */}
      <SignalLight position={[STATION_X - 100, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[STATION_X + 80, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[TRANSFORMER_X - 40, railHeight, trackZ + 4]} color="yellow" />
      <SignalLight position={[JUNCTION_1_X, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[CROSSING_X - 50, railHeight, trackZ + 4]} color="yellow" />
      <SignalLight position={[BRIDGE_X + 100, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[MOUNTAIN_X, railHeight, trackZ + 4]} color="yellow" />
      <SignalLight position={[TUNNEL_X + 450, railHeight, trackZ + 4]} color="red" />
      <SignalLight position={[JUNCTION_2_X, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[FREIGHT_X + 100, railHeight, trackZ + 4]} color="yellow" />

      {/* ═════════════════════════════════════════════
          SERVICE ROAD + ROAD NETWORK
      ═════════════════════════════════════════════ */}
      {/* Main parallel road (south side) */}
      <Box args={[3200, 0.15, 6]} position={[-500, railHeight - 5.4, trackZ - 22]} receiveShadow>
        <meshStandardMaterial color={mc.road.color} roughness={0.95} />
      </Box>
      {/* Road center line */}
      <Box args={[3200, 0.16, 0.3]} position={[-500, railHeight - 5.24, trackZ - 22]} receiveShadow>
        <meshStandardMaterial color={mc.road.markingColor} />
      </Box>
      {/* Secondary road (north side) */}
      <Box args={[1500, 0.15, 5]} position={[STATION_X - 400, railHeight - 5.4, trackZ + 30]} receiveShadow>
        <meshStandardMaterial color={mc.road.color} roughness={0.95} />
      </Box>
      {/* Perpendicular road at crossing */}
      <Box args={[4, 0.15, 100]} position={[CROSSING_X, railHeight - 5.4, trackZ]} receiveShadow>
        <meshStandardMaterial color={mc.road.color} roughness={0.95} />
      </Box>

      {/* ═════════════════════════════════════════════
          LARGE STATION — Multi-platform with FOB
      ═════════════════════════════════════════════ */}
      <group position={[STATION_X, railHeight, trackZ]}>
        {/* ── Platform 1 (south) ── */}
        <Box args={[200, 2.5, 10]} position={[0, -0.5, -14]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.platformColor} roughness={0.9} />
        </Box>
        {/* ── Platform 2 (island) ── */}
        <Box args={[200, 2.5, 8]} position={[0, -0.5, 4]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.platformColor} roughness={0.9} />
        </Box>
        {/* ── Platform 3 (north) ── */}
        <Box args={[200, 2.5, 10]} position={[0, -0.5, 20]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.platformColor} roughness={0.9} />
        </Box>

        {/* ── Platform Roofs ── */}
        {[-14, 4, 20].map(z => (
          <Box key={`roof-${z}`} args={[180, 0.4, z === 4 ? 8 : 10]} position={[0, 7, z]} receiveShadow castShadow>
            <meshStandardMaterial color={mc.station.roofColor} roughness={0.6} />
          </Box>
        ))}
        {/* Roof support pillars */}
        {[-14, 4, 20].map(z =>
          Array.from({ length: 7 }, (_, i) => (
            <Cylinder key={`pillar-${z}-${i}`} args={[0.2, 0.2, 8]} position={[-75 + i * 25, 3.5, z]} castShadow frustumCulled>
              <meshStandardMaterial color="#6b7280" metalness={0.4} />
            </Cylinder>
          ))
        )}

        {/* ── Station Main Building ── */}
        <Box args={[60, 22, 30]} position={[0, 11, -38]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.buildingColor} roughness={0.8} />
        </Box>
        {/* Building accent strip */}
        <Box args={[62, 1.5, 30.5]} position={[0, 22.5, -38]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.accentColor} roughness={0.5} metalness={0.3} />
        </Box>
        {/* Entrance arch */}
        <Box args={[15, 15, 2]} position={[0, 7.5, -22.5]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.accentColor} roughness={0.5} metalness={0.2} />
        </Box>
        {/* Windows on building */}
        {[-20, -10, 10, 20].map(x =>
          [5, 12, 18].map(y => (
            <Box key={`win-${x}-${y}`} args={[3, 2.5, 0.3]} position={[x, y, -22.8]} frustumCulled>
              <meshStandardMaterial color="#bae6fd" roughness={0.2} metalness={0.5} transparent opacity={0.6} />
            </Box>
          ))
        )}

        {/* ── Foot Over Bridge (FOB) ── */}
        {/* FOB walkway */}
        <Box args={[6, 0.8, 40]} position={[-50, 13, 3]} castShadow receiveShadow>
          <meshStandardMaterial color={mc.station.roofColor} metalness={0.3} />
        </Box>
        {/* FOB railings */}
        <Box args={[6, 1.2, 0.15]} position={[-50, 14, -17]} castShadow>
          <meshStandardMaterial color="#6b7280" metalness={0.5} />
        </Box>
        <Box args={[6, 1.2, 0.15]} position={[-50, 14, 23]} castShadow>
          <meshStandardMaterial color="#6b7280" metalness={0.5} />
        </Box>
        {/* FOB support pillars */}
        {[-14, 4, 20].map(z => (
          <Cylinder key={`fob-p-${z}`} args={[0.3, 0.3, 14]} position={[-50, 6.5, z]} castShadow>
            <meshStandardMaterial color="#6b7280" metalness={0.4} />
          </Cylinder>
        ))}
        {/* FOB stairs (simplified) */}
        {[-14, 20].map(z => (
          <Box key={`stair-${z}`} args={[3, 0.5, 6]} position={[-50, 6, z + (z < 0 ? 5 : -5)]}
            rotation={[z < 0 ? 0.5 : -0.5, 0, 0]} castShadow>
            <meshStandardMaterial color={mc.station.platformColor} />
          </Box>
        ))}

        {/* ── Benches on platforms ── */}
        {[-14, 4, 20].map(z =>
          [-60, -30, 0, 30, 60].map(x => (
            <Box key={`bench-${z}-${x}`} args={[3, 0.8, 0.8]} position={[x, 1.6, z]} castShadow frustumCulled>
              <meshStandardMaterial color="#78716c" />
            </Box>
          ))
        )}

        {/* ── Passenger shelter boxes ── */}
        {[-40, 40].map(x => (
          <Box key={`shelter-${x}`} args={[12, 6, 4]} position={[x, 3.5, -14]} castShadow receiveShadow frustumCulled>
            <meshStandardMaterial color={mc.station.buildingColor} roughness={0.8} />
          </Box>
        ))}
      </group>

      {/* ═════════════════════════════════════════════
          PARKING AREA — Near station
      ═════════════════════════════════════════════ */}
      <group position={[PARKING_X, railHeight - 5, trackZ - 45]}>
        <Box args={[50, 0.2, 20]} position={[0, 0.1, 0]} receiveShadow>
          <meshStandardMaterial color={mc.road.color} roughness={0.95} />
        </Box>
        {/* Parking lines */}
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={`pline-${i}`} args={[0.15, 0.22, 4]} position={[-20 + i * 8, 0.22, 0]} receiveShadow>
            <meshStandardMaterial color="white" />
          </Box>
        ))}
      </group>

      {/* ═════════════════════════════════════════════
          MAINTENANCE DEPOT
      ═════════════════════════════════════════════ */}
      <group position={[MAINTENANCE_X, railHeight, trackZ + 30]}>
        <Box args={[40, 12, 20]} position={[0, 6, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </Box>
        <Box args={[42, 1, 22]} position={[0, 12.5, 0]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.station.roofColor} roughness={0.6} />
        </Box>
        {/* Bay doors */}
        {[-12, 0, 12].map(x => (
          <Box key={`bay-${x}`} args={[8, 8, 0.5]} position={[x, 4, -10.5]} castShadow frustumCulled>
            <meshStandardMaterial color="#1e293b" metalness={0.4} />
          </Box>
        ))}
      </group>

      {/* ═════════════════════════════════════════════
          TRANSFORMER YARD
      ═════════════════════════════════════════════ */}
      <group position={[TRANSFORMER_X, railHeight - 5, trackZ - 35]}>
        {/* Yard base */}
        <Box args={[80, 0.5, 40]} position={[0, 0.25, 0]} receiveShadow>
          <meshStandardMaterial color={mc.transformer.baseColor} />
        </Box>
        {/* Transformer units */}
        {[-20, 0, 20].map(x => (
          <group key={`xfmr-${x}`} position={[x, 0.5, 0]}>
            <Box args={[12, 12, 12]} position={[0, 6, 0]} receiveShadow castShadow>
              <meshStandardMaterial color={mc.transformer.unitColor} metalness={0.6} />
            </Box>
            {/* Bushings on top */}
            <Cylinder args={[0.3, 0.3, 4]} position={[-3, 14, 0]} castShadow frustumCulled>
              <meshStandardMaterial color="#94a3b8" metalness={0.7} />
            </Cylinder>
            <Cylinder args={[0.3, 0.3, 4]} position={[3, 14, 0]} castShadow frustumCulled>
              <meshStandardMaterial color="#94a3b8" metalness={0.7} />
            </Cylinder>
          </group>
        ))}
        {/* Perimeter fence */}
        {[[-40, 0, 20], [40, 0, 20], [-40, 0, -20], [40, 0, -20]].map(([x, y, z], i) => (
          <Box key={`fence-${i}`} args={[0.3, 4, 0.3]} position={[x, y + 2, z]} castShadow frustumCulled>
            <meshStandardMaterial color={mc.transformer.fenceColor} />
          </Box>
        ))}
        <Box args={[80, 3, 0.15]} position={[0, 1.5, 20]} frustumCulled>
          <meshStandardMaterial color={mc.transformer.fenceColor} wireframe />
        </Box>
        <Box args={[80, 3, 0.15]} position={[0, 1.5, -20]} frustumCulled>
          <meshStandardMaterial color={mc.transformer.fenceColor} wireframe />
        </Box>
        {/* Warning sign */}
        <Box args={[2, 1.5, 0.15]} position={[0, 4, 20.2]} castShadow>
          <meshStandardMaterial color="#dc2626" />
        </Box>
      </group>

      {/* ═════════════════════════════════════════════
          JUNCTION MARKERS
      ═════════════════════════════════════════════ */}
      {[JUNCTION_1_X, JUNCTION_2_X].map(jx => (
        <group key={`jnc-${jx}`} position={[jx, railHeight, trackZ]}>
          {/* Track divergence hint (triangular markers) */}
          <Box args={[3, 0.5, 25]} position={[0, -0.5, 0]} receiveShadow>
            <meshStandardMaterial color="#475569" metalness={0.5} />
          </Box>
          {/* Junction signal post */}
          <Cylinder args={[0.15, 0.15, 10]} position={[5, 5, 12]} castShadow>
            <meshStandardMaterial color="#334155" metalness={0.5} />
          </Cylinder>
          <Box args={[1.5, 1, 0.3]} position={[5, 10.5, 12]} castShadow>
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
          </Box>
        </group>
      ))}

      {/* ═════════════════════════════════════════════
          EMERGENCY AREA
      ═════════════════════════════════════════════ */}
      <group position={[EMERGENCY_X, railHeight - 5, trackZ - 30]}>
        <Box args={[20, 0.3, 15]} position={[0, 0.15, 0]} receiveShadow>
          <meshStandardMaterial color="#dc2626" roughness={0.9} />
        </Box>
        {/* Emergency shelter */}
        <Box args={[8, 6, 6]} position={[0, 3, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#fef2f2" roughness={0.8} />
        </Box>
        <Box args={[2, 2, 0.2]} position={[0, 5, 3.1]} castShadow>
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
        </Box>
        {/* Corner markers */}
        {[[-10, -7.5], [10, -7.5], [-10, 7.5], [10, 7.5]].map(([x, z], i) => (
          <Cylinder key={`em-${i}`} args={[0.15, 0.15, 3]} position={[x, 1.5, z]} castShadow>
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
          </Cylinder>
        ))}
      </group>

      {/* ═════════════════════════════════════════════
          RAILWAY CROSSING
      ═════════════════════════════════════════════ */}
      <RailwayCrossing
        position={[CROSSING_X, 0, 0]}
        railHeight={railHeight}
        trackZ={trackZ}
        roadColor={mc.crossing.roadColor}
        barrierColor={mc.crossing.barrierColor}
      />

      {/* ═════════════════════════════════════════════
          BRIDGE + ANIMATED RIVER
      ═════════════════════════════════════════════ */}
      <group position={[BRIDGE_X, railHeight, trackZ]}>
        {/* Bridge deck */}
        <Box args={[200, 2, 30]} position={[0, -1, 0]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.bridge.deckColor} metalness={0.5} />
        </Box>
        {/* Bridge pillars */}
        {[-80, -40, 0, 40, 80].map(px => (
          <Cylinder key={`bp-${px}`} args={[2.5, 3, 45]} position={[px, -22, 0]} castShadow receiveShadow frustumCulled>
            <meshStandardMaterial color={mc.bridge.pillarColor} />
          </Cylinder>
        ))}
        {/* Side railings */}
        <Box args={[200, 2.5, 0.3]} position={[0, 1.5, -15]} castShadow>
          <meshStandardMaterial color={mc.bridge.railingColor} metalness={0.4} />
        </Box>
        <Box args={[200, 2.5, 0.3]} position={[0, 1.5, 15]} castShadow>
          <meshStandardMaterial color={mc.bridge.railingColor} metalness={0.4} />
        </Box>
        {/* Railing posts */}
        {Array.from({ length: 11 }, (_, i) => (
          <group key={`rp-${i}`}>
            <Cylinder args={[0.1, 0.1, 3]} position={[-100 + i * 20, 1.5, -15]} castShadow frustumCulled>
              <meshStandardMaterial color={mc.bridge.railingColor} metalness={0.4} />
            </Cylinder>
            <Cylinder args={[0.1, 0.1, 3]} position={[-100 + i * 20, 1.5, 15]} castShadow frustumCulled>
              <meshStandardMaterial color={mc.bridge.railingColor} metalness={0.4} />
            </Cylinder>
          </group>
        ))}
      </group>

      {/* Animated River (underneath bridge) */}
      <AnimatedRiver
        position={[BRIDGE_X, railHeight - 28, trackZ]}
        width={2500}
        length={300}
        color={mc.river.color}
        opacity={mc.river.opacity}
        frozen={mc.river.frozen}
        flowSpeed={mc.river.flowSpeed}
      />

      {/* ═════════════════════════════════════════════
          MOUNTAIN TUNNEL
      ═════════════════════════════════════════════ */}
      <OvalTunnel
        position={[TUNNEL_X - 200, 0, 0]}
        trackZ={trackZ}
        railHeight={railHeight}
        rockColor={mc.tunnel.rockColor}
        wallColor={mc.tunnel.wallColor}
      />

      {/* ═════════════════════════════════════════════
          FREIGHT YARD
      ═════════════════════════════════════════════ */}
      <group position={[FREIGHT_X, railHeight, trackZ]}>
        {/* Loading platform */}
        <Box args={[300, 0.5, 40]} position={[0, -0.25, 25]} receiveShadow>
          <meshStandardMaterial color="#44403c" />
        </Box>
        {/* Warehouse building */}
        <Box args={[80, 25, 25]} position={[-80, 12.5, 35]} receiveShadow castShadow>
          <meshStandardMaterial color={mc.freight.buildingColor} />
        </Box>
        {/* Roof */}
        <Box args={[82, 1, 27]} position={[-80, 25.5, 35]} receiveShadow castShadow>
          <meshStandardMaterial color="#475569" metalness={0.3} />
        </Box>
        {/* Shipping containers (stacked) */}
        {mc.freight.containerColors.map((color, i) => (
          <group key={`ctnr-${i}`}>
            <Box args={[12, 5, 4]} position={[20 + i * 15, 2.5, 28]} castShadow receiveShadow frustumCulled>
              <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
            </Box>
            {i % 2 === 0 && (
              <Box args={[12, 5, 4]} position={[20 + i * 15, 7.5, 28]} castShadow receiveShadow frustumCulled>
                <meshStandardMaterial color={mc.freight.containerColors[(i + 2) % mc.freight.containerColors.length]} roughness={0.7} metalness={0.3} />
              </Box>
            )}
          </group>
        ))}
        {/* Crane (simplified T-shape) */}
        <group position={[40, 0, 25]}>
          <Cylinder args={[0.8, 1, 30]} position={[0, 15, 0]} castShadow>
            <meshStandardMaterial color="#475569" metalness={0.6} />
          </Cylinder>
          <Box args={[40, 1.5, 1.5]} position={[0, 30.5, 0]} castShadow>
            <meshStandardMaterial color="#f59e0b" metalness={0.4} />
          </Box>
        </group>
      </group>

      {/* ═════════════════════════════════════════════
          WARNING BOARDS — Along the track
      ═════════════════════════════════════════════ */}
      {[
        { x: CROSSING_X + 80, label: 'LC' },
        { x: BRIDGE_X + 200, label: 'BR' },
        { x: TUNNEL_X + 500, label: 'TN' },
        { x: STATION_X - 200, label: 'STN' },
        { x: FREIGHT_X + 200, label: 'FY' },
        { x: JUNCTION_1_X + 50, label: 'JN' },
      ].map(wb => (
        <group key={`wb-${wb.x}`} position={[wb.x, railHeight, trackZ + 8]}>
          <Cylinder args={[0.08, 0.1, 6]} position={[0, 3, 0]} castShadow>
            <meshStandardMaterial color="#6b7280" />
          </Cylinder>
          <Box args={[2, 1.5, 0.15]} position={[0, 6.5, 0]} castShadow>
            <meshStandardMaterial color="#fbbf24" />
          </Box>
          <Box args={[1.6, 0.8, 0.16]} position={[0, 6.5, 0.08]} frustumCulled>
            <meshStandardMaterial color="#0f172a" />
          </Box>
        </group>
      ))}
    </group>
  );
}
