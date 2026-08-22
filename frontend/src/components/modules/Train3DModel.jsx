import React, { useRef, useEffect, useState, Suspense, useMemo, useCallback } from 'react';
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
import { TRAIN_TYPES, TRAIN_FLEET, GLB_PRELOAD_LIST } from './digital-twin/TrainAssets';

const { STATION_X, TRANSFORMER_X, BRIDGE_X, MOUNTAIN_X, TUNNEL_X, JUNCTION_2_X, FREIGHT_X } = WORLD_ZONES;

// Pre-allocated vectors to avoid GC pressure in useFrame (60fps)
const _cameraTarget = new THREE.Vector3();
const _cameraPos = new THREE.Vector3();

// ═══════════════════════════════════════════════════════════════════
// TrainEntity — Independent train with full station workflow
//
//  Workflow:  parked → boarding → departing → cruising → arriving → parked
//  Each train runs an independent route within the compact map.
// ═══════════════════════════════════════════════════════════════════
const TrainEntity = React.memo(function TrainEntity({
  id,
  typeConfig,
  locoModel,
  coachModel,
  trackZ,
  railHeight,
  trackSizeX,
  isActiveContext,
  initialPositionX,
  activeEmergency,
  cameraView,
  isParked,
}) {
  const { twinState } = useDigitalTwin();
  const trainRef = useRef();

  const locoY = railHeight - (locoModel ? locoModel.min.y : 0);
  const isHot = activeEmergency === 'EngineFire' || activeEmergency === 'fire';
  const speed = typeConfig.defaultSpeed;

  // Workflow state machine
  const workflow = useRef({
    state: isParked ? 'paused' : 'parked',
    currentSpeed: 0,
    timer: 0,
    stationStopDone: false,
  });
  const prevCommand = useRef(null);

  useFrame((state, delta) => {
    if (!trainRef.current || !locoModel) return;

    const trainX = trainRef.current.position.x;
    const w = workflow.current;

    // ── Speed modifier from twinState (increase/decrease controls) ──
    const speedDelta = isActiveContext ? (twinState?.speedDelta || 0) : 0;
    let baseTargetSpeed = Math.max(0, speed + speedDelta);

    // ── Command overrides — check for per-train commands ──
    const globalCmd = isActiveContext ? twinState?.trainCommand : null;
    const perTrainCmd = twinState?.trainCommands?.[id];
    const cmd = perTrainCmd || globalCmd;

    if (cmd && cmd !== prevCommand.current) {
      if (cmd === 'stop') w.state = 'stopping';
      else if (cmd === 'pause') w.state = 'paused';
      else if (cmd === 'start' || cmd === 'resume') {
        w.state = 'departing';
        w.stationStopDone = true;
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
        if (w.timer > 1) {
          w.state = 'boarding';
          w.timer = 0;
        }
        break;

      case 'boarding':
        targetSpeed = 0;
        w.currentSpeed = 0;
        w.timer += delta;
        if (w.timer > 2) {
          w.state = 'departing';
          w.timer = 0;
        }
        break;

      case 'departing':
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
        w.currentSpeed = 0;
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
    // ── Report state to CommandCenter ──
    if (window.updateTrainState) {
      window.updateTrainState(id, w.state);
    }

    // ── Movement ──
    if (speedMultiplier > 0) {
      const bobbing = Math.sin(state.clock.elapsedTime * 8) * 0.003;
      trainRef.current.position.x -= speedMultiplier * delta * 30;
      trainRef.current.position.y = locoY + bobbing;

      // ── Track loop — wrap around ──
      if (trainRef.current.position.x < FREIGHT_X - 400) {
        trainRef.current.position.x = STATION_X + 300;
        w.stationStopDone = false;
      }
    }

    // ── Camera (only for active train) ──
    if (isActiveContext && cameraView !== 'isometric') {
      if (cameraView === 'driver') {
        const frontX = trainRef.current.position.x - locoModel.size.x / 2 + 1;
        const cabinY = trainRef.current.position.y + locoModel.size.y * 0.85;
        _cameraPos.set(frontX, cabinY, trackZ);
        _cameraTarget.set(frontX - 100, railHeight, trackZ);
        state.camera.position.lerp(_cameraPos, 0.08);
        state.camera.lookAt(_cameraTarget);
      } else if (cameraView === 'tunnel') {
        _cameraPos.set(TUNNEL_X + 50, railHeight + 18, trackZ + 15);
        _cameraTarget.set(TUNNEL_X, railHeight + 5, trackZ);
        state.camera.position.lerp(_cameraPos, 0.04);
        state.camera.lookAt(_cameraTarget);
      } else if (cameraView === 'drone') {
        _cameraPos.set(trainRef.current.position.x + 50, locoY + 60, trackZ + 80);
        _cameraTarget.set(trainRef.current.position.x, locoY, trackZ);
        state.camera.position.lerp(_cameraPos, 0.04);
        state.camera.lookAt(_cameraTarget);
      } else if (cameraView === 'station') {
        _cameraPos.set(STATION_X - 60, locoY + 25, trackZ + 50);
        _cameraTarget.set(STATION_X, locoY + 5, trackZ);
        state.camera.position.lerp(_cameraPos, 0.04);
        state.camera.lookAt(_cameraTarget);
      } else if (cameraView === 'bridge') {
        _cameraPos.set(BRIDGE_X - 40, locoY + 20, trackZ - 50);
        _cameraTarget.set(BRIDGE_X, railHeight - 5, trackZ);
        state.camera.position.lerp(_cameraPos, 0.04);
        state.camera.lookAt(_cameraTarget);
      }
    } else if (isActiveContext && cameraView === 'isometric') {
      _cameraPos.set(trainRef.current.position.x + 100, 60, trackZ + 100);
      _cameraTarget.set(trainRef.current.position.x, locoY, trackZ);
      state.camera.position.lerp(_cameraPos, 0.04);
      state.camera.lookAt(_cameraTarget);
    }
  });

  if (!locoModel) return null;

  const coachCount = typeConfig.coachCount || 0;

  return (
    <group ref={trainRef} position={[initialPositionX, locoY, trackZ]}>
      <Clone object={locoModel.scene} castShadow receiveShadow frustumCulled />

      {coachModel && Array.from({ length: coachCount }).map((_, i) => {
        const offset = (locoModel.size.x / 2) + (coachModel.size.x / 2) + 0.5 + i * (coachModel.size.x + 0.5);
        const coachYOffset = locoModel.min.y - coachModel.min.y;
        return (
          <Clone
            key={i}
            object={coachModel.scene}
            position={[offset, coachYOffset, 0]}
            castShadow={i < 3} // Only first 3 coaches cast shadows for perf
            receiveShadow
            frustumCulled
          />
        );
      })}

      {isHot && <pointLight position={[0, 0, 0]} color="#FF0000" intensity={5} distance={20} />}
      <spotLight position={[-locoModel.size.x / 2, 0, 0]} angle={0.4} penumbra={0.5} intensity={10} castShadow target-position={[-locoModel.size.x / 2 - 20, 0, 0]} />

      {/* Sensors only for the active train */}
      {isActiveContext && (
        <SensorOverlays
          locoPosition={[0, 0, 0]}
          isLocal={true}
          trackZ={0}
          railHeight={0}
          trainType={typeConfig.category}
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
function SceneContent({ onEnvironmentChange, selectedTrainId }) {
  const { cameraView, activeEmergency } = useDigitalTwin();

  // ── Shared GLB Loading (one place, passed to all trains) ──
  const trackGltf = useGLTF('/indian_railway_seane_scan_to_lowpoly.glb');
  const vandeGltf = useGLTF('/vande_bharat_express.glb');
  const wap7Gltf = useGLTF('/wap_7_new_design_low_poly.glb');
  const wag12Gltf = useGLTF('/wag-12.glb');
  const coachGltf = useGLTF('/coach.glb');
  const wagonGltf = useGLTF('/eanos_open_wagon.glb');
  const greenCoachGltf = useGLTF('/green_express_coach.glb');

  // Optional: try loading WAG-9 and WAM-4 (might not be in public yet)
  let wag9Gltf = null, wam4Gltf = null;
  try { wag9Gltf = useGLTF('/wag9.glb'); } catch(e) { /* fallback to WAG-12 */ }
  try { wam4Gltf = useGLTF('/wam4.glb'); } catch(e) { /* fallback to WAP-7 */ }

  const track = useModelBounds(trackGltf, 150, [0, Math.PI / 2, 0]);

  // ── Compute model bounds (shared across all trains) ──
  const vande = useModelBounds(vandeGltf, 150, [0, 0, 0]);
  const wap7 = useModelBounds(wap7Gltf, 22, [0, -Math.PI / 2, 0]);
  const wag12 = useModelBounds(wag12Gltf, 22, [0, -Math.PI / 2, 0]);
  const lhbCoach = useModelBounds(coachGltf, 25, [0, 0, 0]);
  const freightWagon = useModelBounds(wagonGltf, 25, [0, 0, 0]);
  const greenCoach = useModelBounds(greenCoachGltf, 25, [0, 0, 0]);
  const wag9 = useModelBounds(wag9Gltf, 22, [0, -Math.PI / 2, 0]);
  const wam4 = useModelBounds(wam4Gltf, 22, [0, -Math.PI / 2, 0]);

  // Model lookup table
  const modelMap = useMemo(() => ({
    '/vande_bharat_express.glb': vande,
    '/wap_7_new_design_low_poly.glb': wap7,
    '/wag-12.glb': wag12,
    '/wag9.glb': wag9 || wag12, // fallback
    '/wam4.glb': wam4 || wap7, // fallback
    '/coach.glb': lhbCoach,
    '/green_express_coach.glb': greenCoach || lhbCoach, // fallback
    '/eanos_open_wagon.glb': freightWagon,
  }), [vande, wap7, wag12, wag9, wam4, lhbCoach, greenCoach, freightWagon]);

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
  const trackTiles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => i - 14);
  }, []);

  // ── Early return AFTER all hooks ──
  if (!track || alignment.railHeight === 0) return null;

  const trackZ = alignment.trackZ;
  const railHeight = alignment.railHeight;
  const trackSizeX = track.size.x;

  const activeTrainId = selectedTrainId || 'rajdhani';

  return (
    <group>
      <WeatherSystem />

      {/* ── Compact Tiled Tracks (3 parallel lines) ── */}
      <group>
        {trackTiles.map(i => (
          <group key={`track-${i}`}>
            <Clone object={track.scene} position={[trackSizeX * i, 0, 0]} receiveShadow frustumCulled />
            <Clone object={track.scene} position={[trackSizeX * i, 0, 8]} receiveShadow frustumCulled />
            <Clone object={track.scene} position={[trackSizeX * i, 0, -8]} receiveShadow frustumCulled />
          </group>
        ))}
      </group>

      <EnvironmentAssets trackZ={trackZ} railHeight={railHeight} trackSizeX={trackSizeX} />

      {/* Infrastructure Sensors */}
      <SensorOverlays isInfra={true} trackZ={trackZ} railHeight={railHeight} />

      {/* ── Render Train Fleet ── */}
      {TRAIN_FLEET.map(fleet => {
        const typeConfig = TRAIN_TYPES[fleet.typeId];
        if (!typeConfig) return null;

        const locoModel = modelMap[typeConfig.locoGlb];
        const coachModel = typeConfig.coachGlb ? modelMap[typeConfig.coachGlb] : null;
        if (!locoModel) return null;

        return (
          <TrainEntity
            key={fleet.typeId}
            id={fleet.typeId}
            typeConfig={typeConfig}
            locoModel={locoModel}
            coachModel={coachModel}
            trackZ={trackZ + fleet.trackOffset}
            railHeight={railHeight}
            trackSizeX={trackSizeX}
            initialPositionX={fleet.startX}
            activeEmergency={activeTrainId === fleet.typeId ? activeEmergency : null}
            isActiveContext={activeTrainId === fleet.typeId}
            cameraView={cameraView}
            isParked={!fleet.active}
          />
        );
      })}

      <DigitalTwinUI />
      <DashboardOverlays />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Train3DModel — Top-level component that wraps DigitalTwinProvider
// ═══════════════════════════════════════════════════════════════════
export default function Train3DModel({ twinState, onEnvironmentChange, restoredState, onStateCapture, selectedTrainId }) {
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
        <SceneContent onEnvironmentChange={onEnvironmentChange} selectedTrainId={selectedTrainId} />
      </Suspense>
    </DigitalTwinProvider>
  );
}

// Preload all GLBs
GLB_PRELOAD_LIST.forEach(path => useGLTF.preload(path));
