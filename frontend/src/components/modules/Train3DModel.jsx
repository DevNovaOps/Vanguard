import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Box, Clone } from '@react-three/drei';
import * as THREE from 'three';

// Modular Digital Twin Components
import { DigitalTwinProvider, useDigitalTwin } from './digital-twin/DigitalTwinContext';
import { useModelBounds } from './digital-twin/digitalTwinUtils';
import WeatherSystem from './digital-twin/WeatherSystem';
import EnvironmentAssets from './digital-twin/EnvironmentAssets';
import SensorOverlays from './digital-twin/SensorOverlays';
import DigitalTwinUI from './digital-twin/DigitalTwinUI';
import DashboardOverlays from './digital-twin/DashboardOverlays';

function SceneContent({ onEnvironmentChange, contextName }) {
  const { twinState, cameraView, activeEmergency, currentEnvironment, setCurrentEnvironment, setWeatherMode } = useDigitalTwin();
  const lastEnvRef = useRef('Plains');
  
  const isVandeBharat = contextName && contextName.toLowerCase().includes('vande bharat');
  const isFreightTrain = contextName && contextName.toLowerCase().includes('freight');
  
  const locoGltf = useGLTF(isVandeBharat ? '/vande_bharat_express.glb' : (isFreightTrain ? '/wag-12.glb' : '/wap_7_new_design_low_poly.glb'));
  const trackGltf = useGLTF('/indian_railway_seane_scan_to_lowpoly.glb');
  const coachGltf = useGLTF(isFreightTrain ? '/eanos_open_wagon.glb' : '/coach.glb');

  const track = useModelBounds(trackGltf, 150, [0, Math.PI / 2, 0]);
  const loco = useModelBounds(locoGltf, isVandeBharat ? 150 : 22, isVandeBharat ? [0, 0, 0] : [0, -Math.PI / 2, 0]);
  const coach = useModelBounds(coachGltf, 25, [0, 0, 0]);

  const trainRef = useRef();
  const [alignment, setAlignment] = useState({ railHeight: 0, trackZ: 0 });

  // World Layout Constants
  const STATION_X = 500;
  const YARD_X = 300;
  const BRIDGE_X = -200;
  const TUNNEL_X = -600;
  const FREIGHT_X = -800;

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
           if (intersects.length > 0) {
              sumY += intersects[0].point.y;
              hits++;
           }
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
         if (intersects.length > 0) {
            heightsAlongTrack.push(intersects[0].point.y);
         }
      }
      
      let finalRailHeight = 0;
      if (heightsAlongTrack.length > 0) {
         heightsAlongTrack.sort((a, b) => a - b);
         finalRailHeight = heightsAlongTrack[Math.floor(heightsAlongTrack.length / 2)];
      }
      
      setAlignment({ railHeight: finalRailHeight, trackZ: bestZ });
    }
  }, [track]);

  const locoY = alignment.railHeight - (loco ? loco.min.y : 0);
  const trackZ = alignment.trackZ;

  useFrame((state, delta) => {
    if (!track || !loco) return;

    let speedMultiplier = (twinState?.train?.speed || 50) / 100;
    if (activeEmergency) speedMultiplier = 0; 

    // === PASSENGER TRAIN ===
    if (trainRef.current) {
      if (speedMultiplier > 0) {
        const bobbing = Math.sin(state.clock.elapsedTime * 8) * 0.003;
        trainRef.current.position.x -= speedMultiplier * delta * 30;
        trainRef.current.position.y = locoY + bobbing;
      }
      
      const totalTrainLength = loco.size.x + (coach ? coach.size.x * 6 : 0);
      if (trainRef.current.position.x < -track.size.x * 7 - totalTrainLength) {
        trainRef.current.position.x = track.size.x * 4;
      }

      // === ENVIRONMENT ZONE TRACKING ===
      const trainX = trainRef.current.position.x;
      let newEnv = 'Plains';
      let newWeather = 'sunny';
      
      if (trainX > 400) { newEnv = 'Plains'; newWeather = 'sunny'; }
      else if (trainX <= 400 && trainX > 150) { newEnv = 'Desert'; newWeather = 'sunny'; } // Hot
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

      // === CAMERA VIEWS ===
      if (cameraView === 'driver') {
        const frontX = trainRef.current.position.x - loco.size.x / 2 + 1; 
        const cabinY = trainRef.current.position.y + loco.size.y * 0.85; 
        state.camera.position.lerp(new THREE.Vector3(frontX, cabinY, trackZ), 0.08);
        state.camera.lookAt(new THREE.Vector3(frontX - 100, alignment.railHeight, trackZ));
      } else if (cameraView === 'tunnel') {
        state.camera.position.lerp(new THREE.Vector3(TUNNEL_X + 50, alignment.railHeight + 18, trackZ + 15), 0.04);
        state.camera.lookAt(new THREE.Vector3(TUNNEL_X, alignment.railHeight + 5, trackZ));
      } else if (cameraView === 'drone') {
        state.camera.position.lerp(new THREE.Vector3(trainRef.current.position.x + 50, locoY + 60, trackZ + 80), 0.04);
        state.camera.lookAt(new THREE.Vector3(trainRef.current.position.x, locoY, trackZ));
      } else if (cameraView === 'station') {
        state.camera.position.lerp(new THREE.Vector3(STATION_X - 60, locoY + 25, trackZ + 50), 0.04);
        state.camera.lookAt(new THREE.Vector3(STATION_X, locoY + 5, trackZ));
      } else if (cameraView === 'bridge') {
        state.camera.position.lerp(new THREE.Vector3(BRIDGE_X - 40, locoY + 20, trackZ - 50), 0.04);
        state.camera.lookAt(new THREE.Vector3(BRIDGE_X, alignment.railHeight - 5, trackZ));
      } else if (cameraView === 'isometric') {
        state.camera.position.lerp(new THREE.Vector3(trainRef.current.position.x + 100, 60, trackZ + 100), 0.04);
        state.camera.lookAt(new THREE.Vector3(trainRef.current.position.x, locoY, trackZ));
      }
    }
  });

  if (!track || !loco) return null;

  const isHot = activeEmergency === 'EngineFire';

  return (
    <group>
      {/* Dynamic Weather System */}
      <WeatherSystem />

      {/* Massive Tiled Tracks — 18 segments for 5x world */}
      <group>
        {Array.from({ length: 18 }, (_, i) => i - 9).map(i => (
          <Clone key={`track-main-${i}`} object={track.scene} position={[track.size.x * i, 0, 0]} castShadow receiveShadow frustumCulled />
        ))}
        
        {/* 4-Track Yard at Station (X = 300-500) */}
        {[2, 3, 4].map(i => (
           <group key={`yard-${i}`}>
             <Clone object={track.scene} position={[track.size.x * i, 0, 6]} castShadow receiveShadow frustumCulled />
             <Clone object={track.scene} position={[track.size.x * i, 0, 12]} castShadow receiveShadow frustumCulled />
             <Clone object={track.scene} position={[track.size.x * i, 0, -6]} castShadow receiveShadow frustumCulled />
           </group>
        ))}

        {/* Freight Siding near Freight Yard */}
        {[-5, -6].map(i => (
          <Clone key={`freight-siding-${i}`} object={track.scene} position={[track.size.x * i, 0, 8]} castShadow receiveShadow frustumCulled />
        ))}
      </group>

      {/* Environmental Assets */}
      <EnvironmentAssets trackZ={trackZ} railHeight={alignment.railHeight} trackSizeX={track.size.x} />

      {/* =========================================
          PASSENGER TRAIN (WAP-7 + 6 LHB Coaches)
      ========================================= */}
      <group ref={trainRef} position={[track.max.x * 4, locoY, trackZ]}>
         <primitive object={loco.scene} castShadow receiveShadow frustumCulled />
         
         {(!isVandeBharat && coach) && Array.from({ length: 6 }).map((_, i) => {
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
         
         {/* Headlight */}
         <spotLight position={[-loco.size.x / 2, 0, 0]} angle={0.4} penumbra={0.5} intensity={10} castShadow target-position={[-loco.size.x / 2 - 20, 0, 0]} />
      </group>

      {/* Interactive 3D Sensor Tags */}
      {trainRef.current && (
        <SensorOverlays 
          locoPosition={[trainRef.current.position.x, trainRef.current.position.y, trainRef.current.position.z]} 
          trackZ={trackZ} 
          railHeight={alignment.railHeight} 
        />
      )}
      
      {/* 2D UI Overlays */}
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
