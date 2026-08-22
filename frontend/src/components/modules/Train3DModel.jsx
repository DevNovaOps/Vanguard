import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Box, Clone, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Modular Digital Twin Components
import { DigitalTwinProvider, useDigitalTwin } from './digital-twin/DigitalTwinContext';
import { useModelBounds } from './digital-twin/digitalTwinUtils';
import WeatherSystem from './digital-twin/WeatherSystem';
import EnvironmentAssets from './digital-twin/EnvironmentAssets';
import SensorOverlays from './digital-twin/SensorOverlays';
import DigitalTwinUI from './digital-twin/DigitalTwinUI';
import DashboardOverlays from './digital-twin/DashboardOverlays';

// World Layout Constants
const STATION_X = 500;
const YARD_X = 300;
const BRIDGE_X = -200;
const TUNNEL_X = -600;
const FREIGHT_X = -800;

function TrainEntity({ 
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
  setCurrentEnvironment,
  setWeatherMode,
  cameraView
}) {
  const { twinState } = useDigitalTwin();
  const trainRef = useRef();
  const lastEnvRef = useRef('Plains');

  // Load models conditionally or pre-loaded
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

  useFrame((state, delta) => {
    if (!trainRef.current || !loco) return;

    // Independent speed logic
    let speedMultiplier = speed / 100;
    if (activeEmergency) speedMultiplier = 0; 
    // If active context, allow manual override from twinState
    if (isActiveContext && twinState?.train?.speed !== undefined) {
      speedMultiplier = twinState.train.speed / 100;
    }

    if (speedMultiplier > 0) {
      const bobbing = Math.sin(state.clock.elapsedTime * 8) * 0.003;
      trainRef.current.position.x -= speedMultiplier * delta * 30;
      trainRef.current.position.y = locoY + bobbing;
    }
    
    const totalTrainLength = loco.size.x + (coach ? coach.size.x * 6 : 0);
    if (trainRef.current.position.x < -trackSizeX * 7 - totalTrainLength) {
      trainRef.current.position.x = trackSizeX * 4; // Loop back
    }

    // Camera and Environment only for ACTIVE context train
    if (isActiveContext) {
      const trainX = trainRef.current.position.x;
      let newEnv = 'Plains';
      let newWeather = 'sunny';
      
      if (trainX > 400) { newEnv = 'Plains'; newWeather = 'sunny'; }
      else if (trainX <= 400 && trainX > 150) { newEnv = 'Desert'; newWeather = 'sunny'; }
      else if (trainX <= 150 && trainX > -50) { newEnv = 'Rain Forest'; newWeather = 'rain'; }
      else if (trainX <= -50 && trainX > -300) { newEnv = 'Coastal'; newWeather = 'storm'; }
      else if (trainX <= -300 && trainX > -500) { newEnv = 'Snow'; newWeather = 'snow'; }
      else if (trainX <= -500 && trainX > -700) { newEnv = 'Tunnel'; newWeather = 'night'; }
      else if (trainX <= -700) { newEnv = 'Fog Zone'; newWeather = 'fog'; }

      if (newEnv !== lastEnvRef.current) {
        lastEnvRef.current = newEnv;
        setCurrentEnvironment(newEnv);
        setWeatherMode(newWeather);
        if (onEnvironmentChange) onEnvironmentChange(newEnv);
      }

      // Camera views targeted on this active train
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
            locoPosition={[0, 0, 0]} // Render relative to train group
            isLocal={true}
            trackZ={0} 
            railHeight={0} 
            trainType={type}
         />
       )}
    </group>
  );
}

function SceneContent({ onEnvironmentChange, contextName }) {
  const { twinState, cameraView, activeEmergency, setCurrentEnvironment, setWeatherMode } = useDigitalTwin();
  
  const trackGltf = useGLTF('/indian_railway_seane_scan_to_lowpoly.glb');
  const track = useModelBounds(trackGltf, 150, [0, Math.PI / 2, 0]);
  const [alignment, setAlignment] = useState({ railHeight: 0, trackZ: 0 });

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

  if (!track || alignment.railHeight === 0) return null;

  const trackZ = alignment.trackZ;
  const railHeight = alignment.railHeight;
  const trackSizeX = track.size.x;

  // Render 3 independent trains on different tracks/offsets
  const trains = [
    { id: 'passenger', type: 'passenger', zOffset: 0, startX: trackSizeX * 4, speed: 50 },
    { id: 'freight', type: 'freight', zOffset: 8, startX: trackSizeX * 1, speed: 35 },
    { id: 'vandebharat', type: 'vandebharat', zOffset: -8, startX: -trackSizeX * 2, speed: 80 }
  ];

  // Determine which train is currently selected based on contextName
  let activeTrainId = 'passenger';
  if (contextName && contextName.toLowerCase().includes('freight')) activeTrainId = 'freight';
  if (contextName && contextName.toLowerCase().includes('vande bharat')) activeTrainId = 'vandebharat';

  return (
    <group>
      <WeatherSystem />

      {/* Massive Tiled Tracks */}
      <group>
        {Array.from({ length: 18 }, (_, i) => i - 9).map(i => (
          <group key={`track-main-${i}`}>
            <Clone object={track.scene} position={[trackSizeX * i, 0, 0]} castShadow receiveShadow frustumCulled />
            <Clone object={track.scene} position={[trackSizeX * i, 0, 8]} castShadow receiveShadow frustumCulled />
            <Clone object={track.scene} position={[trackSizeX * i, 0, -8]} castShadow receiveShadow frustumCulled />
          </group>
        ))}
        {/* 4-Track Yard */}
        {[2, 3, 4].map(i => (
           <group key={`yard-${i}`}>
             <Clone object={track.scene} position={[trackSizeX * i, 0, 6]} castShadow receiveShadow frustumCulled />
             <Clone object={track.scene} position={[trackSizeX * i, 0, 12]} castShadow receiveShadow frustumCulled />
             <Clone object={track.scene} position={[trackSizeX * i, 0, -6]} castShadow receiveShadow frustumCulled />
           </group>
        ))}
        {/* Freight Siding */}
        {[-5, -6].map(i => (
          <Clone key={`freight-siding-${i}`} object={track.scene} position={[trackSizeX * i, 0, 8]} castShadow receiveShadow frustumCulled />
        ))}
      </group>

      <EnvironmentAssets trackZ={trackZ} railHeight={railHeight} trackSizeX={trackSizeX} />

      {/* Infrastructure Sensors */}
      <SensorOverlays isInfra={true} trackZ={trackZ} railHeight={railHeight} />

      {/* Render Independent Trains */}
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
          setCurrentEnvironment={setCurrentEnvironment}
          setWeatherMode={setWeatherMode}
        />
      ))}
      
      <DigitalTwinUI />
      <DashboardOverlays />
    </group>
  );
}

export default function Train3DModel({ twinState, onEnvironmentChange, restoredState, onStateCapture, contextName }) {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.75;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

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
