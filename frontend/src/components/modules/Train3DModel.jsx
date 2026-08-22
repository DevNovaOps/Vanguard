import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Clone, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Modular Digital Twin Components
import { DigitalTwinProvider, useDigitalTwin } from './digital-twin/DigitalTwinContext';
import { useModelBounds } from './digital-twin/digitalTwinUtils';
import WeatherSystem from './digital-twin/WeatherSystem';
import EnvironmentAssets, { WORLD_ZONES } from './digital-twin/EnvironmentAssets';
import SensorOverlays from './digital-twin/SensorOverlays';
import DigitalTwinUI from './digital-twin/DigitalTwinUI';
import DashboardOverlays from './digital-twin/DashboardOverlays';

const { STATION_X, TRANSFORMER_X, BRIDGE_X, MOUNTAIN_X, TUNNEL_X, JUNCTION_2_X, FREIGHT_X } = WORLD_ZONES;

// ═══════════════════════════════════════════════════════════════════
// TrainEntity — Independent train with full station workflow
//
//  Workflow:  parked → boarding → departing → cruising → arriving → parked
//  Each train runs an independent route within the compact map.
// ═══════════════════════════════════════════════════════════════════
const TrainEntity = React.memo(function TrainEntity({
  id,
  type,
  trackZ,
  railHeight,
  trackSizeX,
  isActiveContext,
  initialPositionX,
  speed,
  activeEmergency,
  onEnvironmentChange,
  cameraView,
}) {
  const { twinState } = useDigitalTwin();
  const trainRef = useRef();

  // Load models
  const vandeGltf = useGLTF('/vande_bharat_express.glb');
  const wap7Gltf = useGLTF('/wap_7_new_design_low_poly.glb');
  const wag12Gltf = useGLTF('/wag-12.glb');
  const coachGltf = useGLTF('/coach.glb');
  const wagonGltf = useGLTF('/eanos_open_wagon.glb');

  // Bounds
  const vande = useModelBounds(vandeGltf, 150, [0, 0, 0]);
  const wap7 = useModelBounds(wap7Gltf, 22, [0, -Math.PI / 2, 0]);
  const wag12 = useModelBounds(wag12Gltf, 22, [0, -Math.PI / 2, 0]);
  const lhbCoach = useModelBounds(coachGltf, 25, [0, 0, 0]);
  const freightWagon = useModelBounds(wagonGltf, 25, [0, 0, 0]);

  const loco = type === 'vandebharat' ? vande : (type === 'freight' ? wag12 : wap7);
  const coach = type === 'vandebharat' ? null : (type === 'freight' ? freightWagon : lhbCoach);

  const locoY = railHeight - (loco ? loco.min.y : 0);

  const isHot = activeEmergency === 'EngineFire' || activeEmergency === 'fire';

  // Workflow state machine
  const workflow = useRef({
    state: 'parked',       // parked | boarding | departing | cruising | arriving | stopping | paused | emergency
    currentSpeed: 0,
    timer: 0,
    stationStopDone: false, // track if we already stopped at station this loop
  });
  const prevCommand = useRef(null);

  useFrame((state, delta) => {
    if (!trainRef.current || !loco) return;

    const trainX = trainRef.current.position.x;
    const w = workflow.current;

    // ── Speed modifier from twinState (increase/decrease controls) ──
    const speedDelta = isActiveContext ? (twinState?.speedDelta || 0) : 0;
    let baseTargetSpeed = Math.max(0, speed + speedDelta);

    // ── Command overrides (only for active train) ──
    const cmd = isActiveContext ? twinState?.trainCommand : null;

    if (cmd && cmd !== prevCommand.current) {
      if (cmd === 'stop') w.state = 'stopping';
      else if (cmd === 'pause') w.state = 'paused';
      else if (cmd === 'start' || cmd === 'resume') {
        w.state = 'departing';
        w.stationStopDone = true; // don't re-stop at station after manual start
      }
      else if (cmd === 'emergency') w.state = 'emergency';
      prevCommand.current = cmd;
    }

    if (activeEmergency) {
      w.state = 'emergency';
    }

    // ── Workflow State Machine ──
    let targetSpeed = baseTargetSpeed;

    switch (w.state) {
      case 'parked':
        targetSpeed = 0;
        w.currentSpeed = 0;
        w.timer += delta;
        if (w.timer > 1) { // Wait 1 second parked
          w.state = 'boarding';
          w.timer = 0;
        }
        break;

      case 'boarding':
        targetSpeed = 0;
        w.currentSpeed = 0;
        w.timer += delta;
        if (w.timer > 2) { // 2 seconds for boarding
          w.state = 'departing';
          w.timer = 0;
        }
        break;

      case 'departing':
        // Smooth acceleration from station
        w.currentSpeed += delta * 12;
        if (w.currentSpeed >= baseTargetSpeed) {
          w.currentSpeed = baseTargetSpeed;
          w.state = 'cruising';
          w.stationStopDone = true;
        }
        targetSpeed = baseTargetSpeed;
        break;

      case 'cruising':
        targetSpeed = baseTargetSpeed;
        // Station arrival check (approach from positive X side)
        if (!w.stationStopDone && trainX < STATION_X + 100 && trainX > STATION_X - 50) {
          w.state = 'arriving';
        }
        break;

      case 'arriving':
        targetSpeed = 0;
        if (w.currentSpeed < 1) {
          w.state = 'boarding';
          w.timer = 0;
          w.currentSpeed = 0;
        }
        break;

      case 'stopping':
      case 'paused':
        targetSpeed = 0;
        break;

      case 'emergency':
        targetSpeed = 0;
        w.currentSpeed = 0; // Instant stop
        break;

      default:
        break;
    }

    // ── Smooth Acceleration / Deceleration ──
    if (w.state !== 'emergency' && w.state !== 'parked' && w.state !== 'boarding') {
      if (w.currentSpeed < targetSpeed) {
        w.currentSpeed += delta * 12;
        if (w.currentSpeed > targetSpeed) w.currentSpeed = targetSpeed;
      } else if (w.currentSpeed > targetSpeed) {
        w.currentSpeed -= delta * 18;
        if (w.currentSpeed < 0) w.currentSpeed = 0;
      }
    }

    const speedMultiplier = w.currentSpeed / 100;

    // ── Report speed to CommandCenter ──
    if (window.updateTrainSpeed) {
      window.updateTrainSpeed(id, w.currentSpeed);
    }

    // ── Movement ──
    if (speedMultiplier > 0) {
      const bobbing = Math.sin(state.clock.elapsedTime * 8) * 0.003;
      trainRef.current.position.x -= speedMultiplier * delta * 30;
      trainRef.current.position.y = locoY + bobbing;
    }

    // ── Loop: wrap train back to start ──
    const totalTrainLength = loco.size.x + (coach ? coach.size.x * 6 : 0);
    if (trainRef.current.position.x < FREIGHT_X - 300 - totalTrainLength) {
      trainRef.current.position.x = STATION_X + 250;
      w.state = 'parked';
      w.timer = 0;
      w.stationStopDone = false;
      w.currentSpeed = 0;
    }

    // ── Camera views (only for active context train) ──
    if (isActiveContext) {
      if (cameraView === 'driver') {
        const frontX = trainRef.current.position.x - loco.size.x / 2 + 1;
        const cabinY = trainRef.current.position.y + loco.size.y * 0.85;
        state.camera.position.lerp(new THREE.Vector3(frontX, cabinY, trackZ), 0.08);
        state.camera.lookAt(new THREE.Vector3(frontX - 100, railHeight, trackZ));
      } else if (cameraView === 'tunnel') {
        state.camera.position.lerp(new THREE.Vector3(TUNNEL_X + 50, railHeight + 18, trackZ + 15), 0.04);
        state.camera.lookAt(new THREE.Vector3(TUNNEL_X, railHeight + 5, trackZ));
      } else if (cameraView === 'drone') {
        state.camera.position.lerp(new THREE.Vector3(trainRef.current.position.x + 50, locoY + 60, trackZ + 80), 0.04);
        state.camera.lookAt(new THREE.Vector3(trainRef.current.position.x, locoY, trackZ));
      } else if (cameraView === 'station') {
        state.camera.position.lerp(new THREE.Vector3(STATION_X - 60, locoY + 25, trackZ + 50), 0.04);
        state.camera.lookAt(new THREE.Vector3(STATION_X, locoY + 5, trackZ));
      } else if (cameraView === 'bridge') {
        state.camera.position.lerp(new THREE.Vector3(BRIDGE_X - 40, locoY + 20, trackZ - 50), 0.04);
        state.camera.lookAt(new THREE.Vector3(BRIDGE_X, railHeight - 5, trackZ));
      } else if (cameraView === 'isometric') {
        state.camera.position.lerp(new THREE.Vector3(trainRef.current.position.x + 100, 60, trackZ + 100), 0.04);
        state.camera.lookAt(new THREE.Vector3(trainRef.current.position.x, locoY, trackZ));
      }
    }
  });

  if (!loco) return null;

  return (
    <group ref={trainRef} position={[initialPositionX, locoY, trackZ]}>
      <primitive object={loco.scene.clone()} castShadow receiveShadow frustumCulled />

      {coach && Array.from({ length: 6 }).map((_, i) => {
        const offset = (loco.size.x / 2) + (coach.size.x / 2) + 0.5 + i * (coach.size.x + 0.5);
        const coachYOffset = loco.min.y - coach.min.y;
        return (
          <Clone
            key={i}
            object={coach.scene}
            position={[offset, coachYOffset, 0]}
            castShadow receiveShadow
            frustumCulled
          />
        );
      })}

      {isHot && <pointLight position={[0, 0, 0]} color="#FF0000" intensity={5} distance={20} />}
      <spotLight position={[-loco.size.x / 2, 0, 0]} angle={0.4} penumbra={0.5} intensity={10} castShadow target-position={[-loco.size.x / 2 - 20, 0, 0]} />

      {/* Sensors only for the active train */}
      {isActiveContext && (
        <SensorOverlays
          locoPosition={[0, 0, 0]}
          isLocal={true}
          trackZ={0}
          railHeight={0}
          trainType={type}
        />
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════════════════
// SceneContent — Orchestrates tracks, trains, weather, and assets
//
//  Compact map: ~22 track tiles spanning the WORLD_ZONES layout.
//  No zone-based weather detection — weather is set by activeMap.
// ═══════════════════════════════════════════════════════════════════
function SceneContent({ onEnvironmentChange, contextName }) {
  const { cameraView, activeEmergency } = useDigitalTwin();

  const trackGltf = useGLTF('/indian_railway_seane_scan_to_lowpoly.glb');
  const track = useModelBounds(trackGltf, 150, [0, Math.PI / 2, 0]);
  const [alignment, setAlignment] = useState({ railHeight: 0, trackZ: 0 });

  // Raycaster-based track alignment (runs once)
  useEffect(() => {
    if (track && track.scene) {
      const raycaster = new THREE.Raycaster();
      track.scene.updateMatrixWorld(true);

      const zSteps = 40;
      const xSteps = 20;
      const zMin = track.min.z;
      const zMax = track.max.z;
      const xMin = track.min.x;
      const xMax = track.max.x;

      let maxAvgHeight = -Infinity;
      let bestZ = 0;

      for (let i = 0; i <= zSteps; i++) {
        const testZ = zMin + i * ((zMax - zMin) / zSteps);
        let sumY = 0;
        let hits = 0;

        for (let j = 0; j <= xSteps; j++) {
          const testX = xMin + j * ((xMax - xMin) / xSteps);
          raycaster.set(new THREE.Vector3(testX, track.max.y + 10, testZ), new THREE.Vector3(0, -1, 0));
          const intersects = raycaster.intersectObject(track.scene, true);
          if (intersects.length > 0) { sumY += intersects[0].point.y; hits++; }
        }

        if (hits > 0) {
          const avgY = sumY / hits;
          if (avgY > maxAvgHeight) {
            maxAvgHeight = avgY;
            bestZ = testZ;
          }
        }
      }

      const heightsAlongTrack = [];
      for (let j = 0; j <= xSteps; j++) {
        const testX = xMin + j * ((xMax - xMin) / xSteps);
        raycaster.set(new THREE.Vector3(testX, track.max.y + 10, bestZ), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(track.scene, true);
        if (intersects.length > 0) heightsAlongTrack.push(intersects[0].point.y);
      }

      let finalRailHeight = 0;
      if (heightsAlongTrack.length > 0) {
        heightsAlongTrack.sort((a, b) => a - b);
        finalRailHeight = heightsAlongTrack[Math.floor(heightsAlongTrack.length / 2)];
      }

      setAlignment({ railHeight: finalRailHeight, trackZ: bestZ });
    }
  }, [track]);

  // ── Compact track tiling: 22 tiles covering the map ──
  // IMPORTANT: All hooks must be called before any conditional returns (Rules of Hooks)
  const trackTiles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => i - 14);
  }, []);

  // ── Train configurations ──
  const trains = useMemo(() => [
    { id: 'passenger', type: 'passenger', zOffset: 0, startX: STATION_X + 100, speed: 130 },
    { id: 'freight', type: 'freight', zOffset: 8, startX: BRIDGE_X + 200, speed: 65 },
    { id: 'vandebharat', type: 'vandebharat', zOffset: -8, startX: MOUNTAIN_X, speed: 160 },
  ], []);

  // ── Early return AFTER all hooks ──
  if (!track || alignment.railHeight === 0) return null;

  const trackZ = alignment.trackZ;
  const railHeight = alignment.railHeight;
  const trackSizeX = track.size.x;

  // Determine which train is currently selected based on contextName
  let activeTrainId = 'passenger';
  if (contextName && contextName.toLowerCase().includes('freight')) activeTrainId = 'freight';
  if (contextName && contextName.toLowerCase().includes('vande bharat')) activeTrainId = 'vandebharat';

  return (
    <group>
      <WeatherSystem />

      {/* ── Compact Tiled Tracks (3 parallel lines) ── */}
      <group>
        {trackTiles.map(i => (
          <group key={`track-${i}`}>
            <Clone object={track.scene} position={[trackSizeX * i, 0, 0]} castShadow receiveShadow frustumCulled />
            <Clone object={track.scene} position={[trackSizeX * i, 0, 8]} castShadow receiveShadow frustumCulled />
            <Clone object={track.scene} position={[trackSizeX * i, 0, -8]} castShadow receiveShadow frustumCulled />
          </group>
        ))}
      </group>

      <EnvironmentAssets trackZ={trackZ} railHeight={railHeight} trackSizeX={trackSizeX} />

      {/* Infrastructure Sensors */}
      <SensorOverlays isInfra={true} trackZ={trackZ} railHeight={railHeight} />

      {/* ── Render Independent Trains ── */}
      {trains.map(t => (
        <TrainEntity
          key={t.id}
          id={t.id}
          type={t.type}
          trackZ={trackZ + t.zOffset}
          railHeight={railHeight}
          trackSizeX={trackSizeX}
          initialPositionX={t.startX}
          speed={t.speed}
          activeEmergency={activeTrainId === t.id ? activeEmergency : null}
          isActiveContext={activeTrainId === t.id}
          cameraView={cameraView}
          onEnvironmentChange={onEnvironmentChange}
        />
      ))}

      <DigitalTwinUI />
      <DashboardOverlays />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Train3DModel — Top-level component that wraps DigitalTwinProvider
// ═══════════════════════════════════════════════════════════════════
export default function Train3DModel({ twinState, onEnvironmentChange, restoredState, onStateCapture, contextName }) {
  const { gl } = useThree();

  useEffect(() => {
    if (gl) {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 0.75;
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DigitalTwinProvider
      twinState={twinState}
      restoredState={restoredState}
      onStateCapture={onStateCapture}
    >
      <Suspense fallback={null}>
        <SceneContent onEnvironmentChange={onEnvironmentChange} contextName={contextName} />
      </Suspense>
    </DigitalTwinProvider>
  );
}

useGLTF.preload('/vande_bharat_express.glb');
useGLTF.preload('/wap_7_new_design_low_poly.glb');
useGLTF.preload('/wag-12.glb');
useGLTF.preload('/indian_railway_seane_scan_to_lowpoly.glb');
useGLTF.preload('/coach.glb');
useGLTF.preload('/eanos_open_wagon.glb');
useGLTF.preload('/city.glb');
