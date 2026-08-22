import React from 'react';
import { useGLTF, Clone, Box, Cylinder, Plane, Sphere } from '@react-three/drei';
import { useModelBounds } from './digitalTwinUtils';
import * as THREE from 'three';

/* =============================================
   PROCEDURAL TREE
============================================= */
function ProcTree({ position, scale = 1 }) {
  return (
    <group position={position}>
      <Cylinder args={[0.15 * scale, 0.25 * scale, 2 * scale]} position={[0, scale, 0]} castShadow>
        <meshStandardMaterial color="#5c3d2e" roughness={1} />
      </Cylinder>
      <Sphere args={[1.2 * scale, 8, 6]} position={[0, 2.5 * scale, 0]} castShadow>
        <meshStandardMaterial color="#2d6a1e" roughness={0.9} />
      </Sphere>
    </group>
  );
}

/* =============================================
   OHE POLE
============================================= */
function OHEPole({ position }) {
  return (
    <group position={position}>
      <Cylinder args={[0.15, 0.2, 12]} position={[0, 6, 0]} castShadow>
        <meshStandardMaterial color="#64748b" metalness={0.5} />
      </Cylinder>
      {/* Cross arm */}
      <Box args={[8, 0.15, 0.15]} position={[0, 11.5, 0]} castShadow>
        <meshStandardMaterial color="#475569" metalness={0.5} />
      </Box>
      {/* Wires (thin boxes) */}
      <Box args={[0.05, 0.05, 30]} position={[-3, 11.5, 15]} castShadow>
        <meshStandardMaterial color="#1e293b" />
      </Box>
      <Box args={[0.05, 0.05, 30]} position={[3, 11.5, 15]} castShadow>
        <meshStandardMaterial color="#1e293b" />
      </Box>
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
   VILLAGE BUILDING
============================================= */
function VillageBuilding({ position, width = 6, height = 8, depth = 5, color = '#d4a574' }) {
  return (
    <group position={position}>
      <Box args={[width, height, depth]} position={[0, height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} />
      </Box>
      {/* Roof */}
      <Box args={[width + 1, 0.5, depth + 1]} position={[0, height + 0.25, 0]} castShadow>
        <meshStandardMaterial color="#78350f" roughness={0.8} />
      </Box>
    </group>
  );
}

/* =============================================
   MAIN ENVIRONMENT COMPONENT
============================================= */
export default function EnvironmentAssets({ trackZ, railHeight, trackSizeX }) {
  const cityGltf = useGLTF('/city.glb');
  const city = useModelBounds(cityGltf, 300, [0, 0, 0]);

  // World Layout Coordinates (5x expanded)
  const STATION_X = 500;
  const YARD_X = 300;
  const TRANSFORMER_X = 100;
  const BRIDGE_X = -200;
  const COUNTRYSIDE_X = -400;
  const TUNNEL_X = -600;
  const FREIGHT_X = -800;

  return (
    <group>

      {/* =========================================
          REGIONAL TERRAIN PLANES
      ========================================= */}
      {/* Plains (X: 400 to 1000) */}
      <mesh position={[700, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 2000]} />
        <meshStandardMaterial color="#4ade80" roughness={1} />
      </mesh>
      {/* Desert (X: 150 to 400) */}
      <mesh position={[275, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[250, 2000]} />
        <meshStandardMaterial color="#fcd34d" roughness={1} />
      </mesh>
      {/* Rain Forest (X: -50 to 150) */}
      <mesh position={[50, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 2000]} />
        <meshStandardMaterial color="#166534" roughness={1} />
      </mesh>
      {/* Coastal (X: -300 to -50) */}
      <mesh position={[-175, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[250, 2000]} />
        <meshStandardMaterial color="#86efac" roughness={1} />
      </mesh>
      {/* Snow (X: -500 to -300) */}
      <mesh position={[-400, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 2000]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
      {/* Tunnel / Rocky (X: -700 to -500) */}
      <mesh position={[-600, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 2000]} />
        <meshStandardMaterial color="#57534e" roughness={1} />
      </mesh>
      {/* Fog Zone / Dense Forest (X: -1200 to -700) */}
      <mesh position={[-950, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 2000]} />
        <meshStandardMaterial color="#064e3b" roughness={1} />
      </mesh>
      {/* =========================================
          BACKGROUND CITY
      ========================================= */}
      {city && (
        <group position={[0, -2, trackZ - 150]}>
          <Clone object={city.scene} position={[STATION_X, 0, 0]} castShadow receiveShadow frustumCulled />
          <Clone object={city.scene} position={[0, 0, -80]} castShadow receiveShadow frustumCulled />
        </group>
      )}

      {/* =========================================
          OHE POLES (Every ~40 units along main track)
      ========================================= */}
      {Array.from({ length: 35 }).map((_, i) => (
        <OHEPole key={`ohe-${i}`} position={[(i - 17) * 40, railHeight, trackZ + 6]} />
      ))}

      {/* =========================================
          SIGNAL LIGHTS
      ========================================= */}
      <SignalLight position={[STATION_X - 80, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[STATION_X + 80, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[YARD_X, railHeight, trackZ + 4]} color="yellow" />
      <SignalLight position={[0, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[BRIDGE_X + 80, railHeight, trackZ + 4]} color="green" />
      <SignalLight position={[TUNNEL_X + 80, railHeight, trackZ + 4]} color="red" />
      <SignalLight position={[FREIGHT_X + 40, railHeight, trackZ + 4]} color="yellow" />

      {/* =========================================
          TREES (Scattered along route)
      ========================================= */}
      {/* Station area */}
      {[STATION_X - 100, STATION_X - 120, STATION_X + 60, STATION_X + 90].map((x, i) => (
        <ProcTree key={`st-tree-${i}`} position={[x, railHeight - 5, trackZ - 25 + (i % 2) * 10]} scale={1.5 + Math.random()} />
      ))}
      {/* Open countryside */}
      {Array.from({ length: 25 }).map((_, i) => {
        const x = COUNTRYSIDE_X + (i - 12) * 30 + Math.random() * 15;
        const z = trackZ - 20 - Math.random() * 80;
        return <ProcTree key={`ct-tree-${i}`} position={[x, railHeight - 5, z]} scale={1 + Math.random() * 2} />;
      })}
      {/* Bridge area trees */}
      {Array.from({ length: 8 }).map((_, i) => (
        <ProcTree key={`br-tree-${i}`} position={[BRIDGE_X + (i - 4) * 25, railHeight - 5, trackZ - 40 - Math.random() * 30]} scale={1.5 + Math.random()} />
      ))}

      {/* =========================================
          SERVICE ROAD (Parallel to track)
      ========================================= */}
      <Box args={[1600, 0.1, 5]} position={[0, railHeight - 5.5, trackZ - 18]} receiveShadow>
        <meshStandardMaterial color="#6b7280" roughness={0.95} />
      </Box>

      {/* =========================================
          STATION (X = +500)
      ========================================= */}
      <group position={[STATION_X, railHeight, trackZ]}>
        {/* Platform 1 */}
        <Box args={[180, 2.5, 10]} position={[0, -0.5, -12]} receiveShadow castShadow>
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </Box>
        {/* Platform 2 */}
        <Box args={[180, 2.5, 10]} position={[0, -0.5, 18]} receiveShadow castShadow>
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </Box>

        {/* Platform Yellow Strip */}
        <Box args={[180, 0.05, 0.5]} position={[0, 0.8, -7.2]} receiveShadow>
          <meshStandardMaterial color="#eab308" />
        </Box>
        <Box args={[180, 0.05, 0.5]} position={[0, 0.8, 13.2]} receiveShadow>
          <meshStandardMaterial color="#eab308" />
        </Box>

        {/* Pillars & Roof */}
        {[-70, -40, -10, 20, 50, 80].map((px) => (
          <group key={`pillars-${px}`}>
            <Cylinder args={[0.25, 0.25, 7]} position={[px, 3.5, -12]} castShadow>
              <meshStandardMaterial color="#475569" metalness={0.4} />
            </Cylinder>
            <Cylinder args={[0.25, 0.25, 7]} position={[px, 3.5, 18]} castShadow>
              <meshStandardMaterial color="#475569" metalness={0.4} />
            </Cylinder>
          </group>
        ))}

        {/* Roof 1 & 2 */}
        <Box args={[180, 0.4, 14]} position={[0, 7, -12]} receiveShadow castShadow>
          <meshStandardMaterial color="#0369a1" roughness={0.6} />
        </Box>
        <Box args={[180, 0.4, 14]} position={[0, 7, 18]} receiveShadow castShadow>
          <meshStandardMaterial color="#0369a1" roughness={0.6} />
        </Box>

        {/* Station Main Building */}
        <Box args={[50, 18, 25]} position={[0, 9, -35]} receiveShadow castShadow>
          <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
        </Box>
        {/* Ticket Counter */}
        <Box args={[25, 5, 6]} position={[0, 2.5, -22]} receiveShadow castShadow>
          <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
        </Box>

        {/* Foot Over Bridge */}
        <Cylinder args={[0.2, 0.2, 10]} position={[30, 5, -12]} castShadow><meshStandardMaterial color="#475569" metalness={0.4} /></Cylinder>
        <Cylinder args={[0.2, 0.2, 10]} position={[30, 5, 18]} castShadow><meshStandardMaterial color="#475569" metalness={0.4} /></Cylinder>
        <Box args={[4, 1, 35]} position={[30, 10, 3]} receiveShadow castShadow>
          <meshStandardMaterial color="#64748b" metalness={0.3} />
        </Box>
        <Box args={[4.5, 0.2, 35]} position={[30, 12, 3]} receiveShadow castShadow>
          <meshStandardMaterial color="#94a3b8" />
        </Box>

        {/* Display Boards */}
        <Box args={[5, 1.2, 0.2]} position={[0, 5, -12]} castShadow>
          <meshStandardMaterial color="#000000" emissive="#3b82f6" emissiveIntensity={0.6} />
        </Box>
        <Box args={[5, 1.2, 0.2]} position={[0, 5, 18]} castShadow>
          <meshStandardMaterial color="#000000" emissive="#3b82f6" emissiveIntensity={0.6} />
        </Box>

        {/* Benches */}
        {[-50, -25, 25, 50, 70].map((px) => (
          <group key={`benches-${px}`}>
            <Box args={[3.5, 0.5, 1]} position={[px, 0.8, -12]} castShadow><meshStandardMaterial color="#92400e" /></Box>
            <Box args={[3.5, 0.5, 1]} position={[px, 0.8, 18]} castShadow><meshStandardMaterial color="#92400e" /></Box>
          </group>
        ))}

        {/* Platform Lights */}
        {[-60, -20, 20, 60].map((px) => (
          <group key={`plight-${px}`}>
            <pointLight position={[px, 6.5, -12]} color="#fef3c7" intensity={1} distance={20} />
            <pointLight position={[px, 6.5, 18]} color="#fef3c7" intensity={1} distance={20} />
          </group>
        ))}
      </group>

      {/* =========================================
          RAILWAY YARD (X = +300)
      ========================================= */}
      <group position={[YARD_X, railHeight, trackZ]}>
        {/* Yard Fencing */}
        <Box args={[120, 3, 0.2]} position={[0, 1.5, -20]} castShadow>
          <meshStandardMaterial color="#6b7280" roughness={0.8} />
        </Box>
        <Box args={[120, 3, 0.2]} position={[0, 1.5, 25]} castShadow>
          <meshStandardMaterial color="#6b7280" roughness={0.8} />
        </Box>
      </group>

      {/* =========================================
          TRANSFORMER YARD (X = +100)
      ========================================= */}
      <group position={[TRANSFORMER_X, railHeight, trackZ - 20]}>
        {/* Transformer body */}
        <Box args={[6, 8, 5]} position={[0, 4, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.6} />
        </Box>
        {/* Cooling fins */}
        <Box args={[7, 6, 0.3]} position={[0, 3, 3]} castShadow>
          <meshStandardMaterial color="#4b5563" metalness={0.6} />
        </Box>
        <Box args={[7, 6, 0.3]} position={[0, 3, -3]} castShadow>
          <meshStandardMaterial color="#4b5563" metalness={0.6} />
        </Box>
        {/* Bushings */}
        <Cylinder args={[0.3, 0.3, 4]} position={[-2, 10, 0]} castShadow>
          <meshStandardMaterial color="#854d0e" />
        </Cylinder>
        <Cylinder args={[0.3, 0.3, 4]} position={[2, 10, 0]} castShadow>
          <meshStandardMaterial color="#854d0e" />
        </Cylinder>
        {/* Fence */}
        <Box args={[16, 4, 0.2]} position={[0, 2, 6]} castShadow>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[16, 4, 0.2]} position={[0, 2, -6]} castShadow>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[0.2, 4, 12]} position={[-8, 2, 0]} castShadow>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[0.2, 4, 12]} position={[8, 2, 0]} castShadow>
          <meshStandardMaterial color="#6b7280" />
        </Box>
      </group>

      {/* =========================================
          VILLAGE (Offset from track near countryside)
      ========================================= */}
      <group position={[COUNTRYSIDE_X, railHeight - 5, trackZ - 60]}>
        <VillageBuilding position={[0, 0, 0]} width={8} height={6} color="#d4a574" />
        <VillageBuilding position={[20, 0, 10]} width={6} height={8} color="#c2956c" />
        <VillageBuilding position={[-15, 0, 15]} width={5} height={5} color="#e8d5b8" />
        <VillageBuilding position={[35, 0, -5]} width={7} height={7} color="#b8926a" />
        <VillageBuilding position={[-30, 0, 5]} width={10} height={4} color="#d4a574" />
        <VillageBuilding position={[10, 0, 30]} width={5} height={10} color="#9ca3af" />
      </group>

      {/* =========================================
          BRIDGE & RIVER (X = -200)
      ========================================= */}
      <group position={[BRIDGE_X, railHeight, trackZ]}>
        {/* Wide River — raised to be visible */}
        <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[250, 500]} />
          <meshStandardMaterial color="#0284c7" transparent opacity={0.6} roughness={0.1} />
        </mesh>

        {/* River Banks */}
        <Box args={[50, 12, 500]} position={[-100, -6, 0]} receiveShadow><meshStandardMaterial color="#3f6212" roughness={1} /></Box>
        <Box args={[50, 12, 500]} position={[100, -6, 0]} receiveShadow><meshStandardMaterial color="#3f6212" roughness={1} /></Box>
        {/* Rocks */}
        <Sphere args={[4, 8, 6]} position={[-72, -5, -30]} receiveShadow><meshStandardMaterial color="#57534e" roughness={1} /></Sphere>
        <Sphere args={[6, 8, 6]} position={[68, -5, 40]} receiveShadow><meshStandardMaterial color="#57534e" roughness={1} /></Sphere>
        <Sphere args={[3, 8, 6]} position={[-65, -5, 60]} receiveShadow><meshStandardMaterial color="#57534e" roughness={1} /></Sphere>

        {/* Steel Truss Bridge */}
        <group position={[0, -2, 0]}>
          <Box args={[160, 2, 2]} position={[0, 1, -6]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>
          <Box args={[160, 2, 2]} position={[0, 1, 6]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>

          {/* Concrete Pillars */}
          <Cylinder args={[3, 4, 18]} position={[-50, -8, -6]} castShadow><meshStandardMaterial color="#a8a29e" /></Cylinder>
          <Cylinder args={[3, 4, 18]} position={[-50, -8, 6]} castShadow><meshStandardMaterial color="#a8a29e" /></Cylinder>
          <Cylinder args={[3, 4, 18]} position={[50, -8, -6]} castShadow><meshStandardMaterial color="#a8a29e" /></Cylinder>
          <Cylinder args={[3, 4, 18]} position={[50, -8, 6]} castShadow><meshStandardMaterial color="#a8a29e" /></Cylinder>

          {/* Truss Verticals & Cross-bracing */}
          {[-70, -50, -30, -10, 10, 30, 50, 70].map(px => (
            <group key={`truss-${px}`}>
              <Box args={[1.2, 16, 1.2]} position={[px, 8, -6]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>
              <Box args={[1.2, 16, 1.2]} position={[px, 8, 6]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>
              <Box args={[1.2, 1.2, 13]} position={[px, 16, 0]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>
            </group>
          ))}
          {/* Diagonals */}
          {[-60, -40, -20, 0, 20, 40, 60].map(px => (
            <group key={`diag-${px}`}>
              <Box args={[0.8, 22, 0.8]} position={[px, 8, -6]} rotation={[0, 0, 0.6]} castShadow><meshStandardMaterial color="#475569" metalness={0.6} /></Box>
              <Box args={[0.8, 22, 0.8]} position={[px, 8, 6]} rotation={[0, 0, 0.6]} castShadow><meshStandardMaterial color="#475569" metalness={0.6} /></Box>
            </group>
          ))}
          {/* Top Girders */}
          <Box args={[160, 2, 2]} position={[0, 16, -6]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>
          <Box args={[160, 2, 2]} position={[0, 16, 6]} castShadow><meshStandardMaterial color="#334155" metalness={0.7} /></Box>
        </group>
      </group>

      {/* =========================================
          TUNNEL & MOUNTAIN (X = -600)
      ========================================= */}
      <group position={[TUNNEL_X, railHeight, trackZ]}>
        {/* Mountain — realistic scale */}
        <Box args={[80, 35, 80]} position={[-30, 15, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#57534e" roughness={1} />
        </Box>
        <Box args={[60, 45, 60]} position={[-50, 18, -20]} receiveShadow castShadow>
          <meshStandardMaterial color="#3f6212" roughness={1} />
        </Box>
        <Box args={[50, 30, 50]} position={[-20, 12, 25]} receiveShadow castShadow>
          <meshStandardMaterial color="#365314" roughness={1} />
        </Box>
        {/* Rock face */}
        <Box args={[15, 25, 30]} position={[10, 10, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#44403c" roughness={1} />
        </Box>

        {/* Tunnel Interior */}
        <Box args={[80, 14, 14]} position={[-30, 7, 0]}>
          <meshStandardMaterial color="#000000" roughness={1} />
        </Box>

        {/* Concrete Portal */}
        <Box args={[2, 14, 3]} position={[18, 7, -8]} castShadow receiveShadow><meshStandardMaterial color="#a8a29e" /></Box>
        <Box args={[2, 14, 3]} position={[18, 7, 8]} castShadow receiveShadow><meshStandardMaterial color="#a8a29e" /></Box>
        <Box args={[2, 3, 19]} position={[18, 15.5, 0]} castShadow receiveShadow><meshStandardMaterial color="#a8a29e" /></Box>
        
        {/* Portal Arch Detail */}
        <Box args={[1, 1.5, 20]} position={[19, 17, 0]} castShadow><meshStandardMaterial color="#78716c" /></Box>

        {/* Tunnel Lights */}
        <pointLight position={[10, 10, 0]} color="#fbbf24" intensity={2} distance={25} />
        <pointLight position={[-10, 10, 0]} color="#fbbf24" intensity={2} distance={25} />
        <pointLight position={[-30, 10, 0]} color="#fbbf24" intensity={2} distance={25} />
      </group>

      {/* =========================================
          FREIGHT YARD / MAINTENANCE DEPOT (X = -800)
      ========================================= */}
      <group position={[FREIGHT_X, railHeight, trackZ]}>
        {/* Shed */}
        <Box args={[50, 12, 20]} position={[0, 6, -15]} receiveShadow castShadow>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </Box>
        {/* Shed Roof */}
        <Box args={[55, 0.5, 25]} position={[0, 12.5, -15]} receiveShadow castShadow>
          <meshStandardMaterial color="#64748b" metalness={0.3} />
        </Box>
        {/* Loading Bay */}
        <Box args={[30, 3, 8]} position={[0, 1.5, -5]} receiveShadow castShadow>
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </Box>
        {/* Crane */}
        <Cylinder args={[0.3, 0.3, 18]} position={[20, 9, -5]} castShadow>
          <meshStandardMaterial color="#eab308" />
        </Cylinder>
        <Box args={[20, 0.5, 0.5]} position={[10, 18, -5]} castShadow>
          <meshStandardMaterial color="#eab308" />
        </Box>
      </group>

    </group>
  );
}

useGLTF.preload('/city.glb');
