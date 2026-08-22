import React, { useMemo } from 'react';
import { useGLTF, Clone, Box, Cylinder, Sphere, Instances, Instance, Tube } from '@react-three/drei';
import { useModelBounds } from './digitalTwinUtils';
import * as THREE from 'three';

// Export world constants so Train3DModel and others can share them
export const WORLD_ZONES = {
  STATION_X: 2500,
  YARD_X: 1800,
  TRANSFORMER_X: 1200,
  CENTRAL_JUNCTION_X: 0,
  BRIDGE_X: -1000,
  MOUNTAIN_JUNCTION_X: -2000,
  TUNNEL_X: -3000,
  COASTAL_JUNCTION_X: -3800,
  FREIGHT_X: -4500,
};

/* =============================================
   INSTANCED TREES
============================================= */
function TreeInstances({ positions }) {
  return (
    <group>
      <Instances limit={2000} range={positions.length} castShadow frustumCulled>
        <cylinderGeometry args={[0.15, 0.25, 2]} />
        <meshStandardMaterial color="#5c3d2e" roughness={1} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + p.scale, p.z]} scale={p.scale} />
        ))}
      </Instances>
      <Instances limit={2000} range={positions.length} castShadow frustumCulled>
        <sphereGeometry args={[1.2, 8, 6]} />
        <meshStandardMaterial color="#2d6a1e" roughness={0.9} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 2.5 * p.scale, p.z]} scale={p.scale} />
        ))}
      </Instances>
    </group>
  );
}

/* =============================================
   INSTANCED OHE POLES
============================================= */
function PoleInstances({ positions }) {
  return (
    <group>
      <Instances limit={500} range={positions.length} castShadow frustumCulled>
        <cylinderGeometry args={[0.15, 0.2, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 6, p.z]} />
        ))}
      </Instances>
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
}

/* =============================================
   SIGNAL LIGHT
============================================= */
function SignalLight({ position, color = 'green' }) {
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
}

/* =============================================
   OVAL TUNNEL
============================================= */
function OvalTunnel({ position, trackZ, railHeight }) {
  const curve = useMemo(() => {
    return new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(400, 0, 0));
  }, []);

  return (
    <group position={position}>
      {/* The Tunnel Tube */}
      <mesh position={[200, railHeight - 2, trackZ]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <tubeGeometry args={[curve, 20, 16, 16, false]} />
        <meshStandardMaterial color="#292524" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Mountain Covering */}
      <mesh position={[200, railHeight + 5, trackZ]} receiveShadow castShadow>
        <cylinderGeometry args={[25, 30, 400, 8, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
    </group>
  );
}

/* =============================================
   MAIN ENVIRONMENT COMPONENT
============================================= */
export default function EnvironmentAssets({ trackZ, railHeight, trackSizeX }) {
  const cityGltf = useGLTF('/city.glb');
  const city = useModelBounds(cityGltf, 300, [0, 0, 0]);

  const { STATION_X, YARD_X, TRANSFORMER_X, CENTRAL_JUNCTION_X, BRIDGE_X, MOUNTAIN_JUNCTION_X, TUNNEL_X, COASTAL_JUNCTION_X, FREIGHT_X } = WORLD_ZONES;

  // Generate instances data using useMemo to prevent recalculation
  const { treePositions, polePositions } = useMemo(() => {
    const trees = [];
    const poles = [];
    
    // Trees along the track (Scattered over 10,000 units)
    for (let i = 0; i < 400; i++) {
      const x = (Math.random() - 0.5) * 10000;
      // Keep trees away from track
      const zOffset = Math.random() > 0.5 ? 25 + Math.random() * 100 : -25 - Math.random() * 100;
      trees.push({ x, y: railHeight - 5, z: trackZ + zOffset, scale: 1 + Math.random() * 2 });
    }

    // Poles along the track
    for (let i = -100; i < 100; i++) {
      poles.push({ x: i * 40, y: railHeight, z: trackZ + 6 });
    }

    return { treePositions: trees, polePositions: poles };
  }, [railHeight, trackZ]);

  return (
    <group>
      {/* =========================================
          REGIONAL TERRAIN PLANES (Massive Map)
      ========================================= */}
      <mesh position={[2000, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 4000]} />
        <meshStandardMaterial color="#4ade80" roughness={1} /> {/* Plains */}
      </mesh>
      
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 4000]} />
        <meshStandardMaterial color="#fcd34d" roughness={1} /> {/* Desert */}
      </mesh>
      
      <mesh position={[-2000, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 4000]} />
        <meshStandardMaterial color="#166534" roughness={1} /> {/* Forest */}
      </mesh>
      
      <mesh position={[-4000, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 4000]} />
        <meshStandardMaterial color="#86efac" roughness={1} /> {/* Coastal */}
      </mesh>

      {/* =========================================
          BACKGROUND CITY
      ========================================= */}
      {city && (
        <group position={[0, -2, trackZ - 250]}>
          <Clone object={city.scene} position={[STATION_X, 0, 0]} castShadow receiveShadow frustumCulled />
          <Clone object={city.scene} position={[CENTRAL_JUNCTION_X, 0, -80]} castShadow receiveShadow frustumCulled />
          <Clone object={city.scene} position={[COASTAL_JUNCTION_X, 0, -50]} castShadow receiveShadow frustumCulled />
        </group>
      )}

      {/* =========================================
          INSTANCED ASSETS
      ========================================= */}
      <TreeInstances positions={treePositions} />
      <PoleInstances positions={polePositions} />

      {/* =========================================
          SIGNAL LIGHTS (Spaced out for 3 trains)
      ========================================= */}
      <SignalLight position={[STATION_X - 80, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[YARD_X, railHeight, trackZ + 4]} color="yellow" />
      <SignalLight position={[CENTRAL_JUNCTION_X, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[BRIDGE_X + 150, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[MOUNTAIN_JUNCTION_X, railHeight, trackZ + 4]} color="yellow" />
      <SignalLight position={[TUNNEL_X + 450, railHeight, trackZ + 4]} color="red" />
      <SignalLight position={[COASTAL_JUNCTION_X, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[FREIGHT_X + 100, railHeight, trackZ + 4]} color="yellow" />

      {/* =========================================
          SERVICE ROAD (Extended)
      ========================================= */}
      <Box args={[10000, 0.1, 5]} position={[0, railHeight - 5.5, trackZ - 18]} receiveShadow>
        <meshStandardMaterial color="#6b7280" roughness={0.95} />
      </Box>

      {/* =========================================
          STATION (X = STATION_X)
      ========================================= */}
      <group position={[STATION_X, railHeight, trackZ]}>
        <Box args={[180, 2.5, 10]} position={[0, -0.5, -12]} receiveShadow castShadow>
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </Box>
        <Box args={[180, 2.5, 10]} position={[0, -0.5, 18]} receiveShadow castShadow>
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </Box>
        <Box args={[180, 0.4, 14]} position={[0, 7, -12]} receiveShadow castShadow>
          <meshStandardMaterial color="#0369a1" roughness={0.6} />
        </Box>
        <Box args={[180, 0.4, 14]} position={[0, 7, 18]} receiveShadow castShadow>
          <meshStandardMaterial color="#0369a1" roughness={0.6} />
        </Box>
        <Box args={[50, 18, 25]} position={[0, 9, -35]} receiveShadow castShadow>
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
        </Box>
      </group>

      {/* =========================================
          TRANSFORMER SUBSTATION
      ========================================= */}
      <group position={[TRANSFORMER_X, railHeight - 5, trackZ - 30]}>
        <Box args={[80, 0.5, 40]} position={[0, 0.25, 0]} receiveShadow><meshStandardMaterial color="#57534e" /></Box>
        <Box args={[15, 15, 15]} position={[-20, 8, 0]} receiveShadow castShadow><meshStandardMaterial color="#334155" metalness={0.6} /></Box>
        <Box args={[15, 15, 15]} position={[20, 8, 0]} receiveShadow castShadow><meshStandardMaterial color="#334155" metalness={0.6} /></Box>
      </group>

      {/* =========================================
          BRIDGE (Now over transparent blue water)
      ========================================= */}
      <group position={[BRIDGE_X, railHeight, trackZ]}>
        <Box args={[200, 2, 10]} position={[0, -1, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#94a3b8" metalness={0.5} />
        </Box>
        {[-80, -40, 0, 40, 80].map((px) => (
          <Cylinder key={`pillar-${px}`} args={[2, 2, 40]} position={[px, -20, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#78716c" />
          </Cylinder>
        ))}
        {/* River Water: Blue, Transparent, Reflective */}
        <mesh position={[0, -25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[300, 2000]} />
          <meshPhysicalMaterial 
            color="#0ea5e9" 
            transparent={true} 
            opacity={0.8} 
            roughness={0.1} 
            transmission={0.9} 
            ior={1.33} 
          />
        </mesh>
      </group>

      {/* =========================================
          OVAL TUNNEL
      ========================================= */}
      <OvalTunnel position={[TUNNEL_X - 200, 0, 0]} trackZ={trackZ} railHeight={railHeight} />

      {/* =========================================
          FREIGHT DEPOT
      ========================================= */}
      <group position={[FREIGHT_X, railHeight, trackZ]}>
        <Box args={[300, 0.5, 40]} position={[0, -0.25, 20]} receiveShadow>
          <meshStandardMaterial color="#44403c" />
        </Box>
        <Box args={[60, 25, 20]} position={[-80, 12.5, 30]} receiveShadow castShadow>
          <meshStandardMaterial color="#1e293b" />
        </Box>
      </group>
    </group>
  );
}
