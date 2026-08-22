import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Sky, Sparkles } from '@react-three/drei';
import { useDigitalTwin } from './DigitalTwinContext';
import * as THREE from 'three';

export default function WeatherSystem() {
  const { weatherMode } = useDigitalTwin();

  const configs = {
    sunny: {
      skyColor: '#87CEEB',
      fogColor: '#b0d4e8',
      fogNear: 100,
      fogFar: 2000,
      sunPosition: [50, 80, -50],
      ambientIntensity: 0.6,
      directionalIntensity: 2.0,
      hemiSky: '#87CEEB',
      hemiGround: '#3f6212',
      hemiIntensity: 0.4,
      preset: 'dawn',
      particles: null
    },
    rain: {
      skyColor: '#4b5563',
      fogColor: '#4b5563',
      fogNear: 50,
      fogFar: 800,
      sunPosition: [0, -10, 0],
      ambientIntensity: 0.25,
      directionalIntensity: 0.4,
      hemiSky: '#6b7280',
      hemiGround: '#1f2937',
      hemiIntensity: 0.3,
      preset: 'sunset',
      particles: 'rain'
    },
    storm: {
      skyColor: '#1f2937',
      fogColor: '#1f2937',
      fogNear: 30,
      fogFar: 500,
      sunPosition: [0, -10, 0],
      ambientIntensity: 0.08,
      directionalIntensity: 0.15,
      hemiSky: '#374151',
      hemiGround: '#111827',
      hemiIntensity: 0.15,
      preset: 'night',
      particles: 'rain'
    },
    fog: {
      skyColor: '#d1d5db',
      fogColor: '#d1d5db',
      fogNear: 10,
      fogFar: 200,
      sunPosition: [0, 20, 0],
      ambientIntensity: 0.5,
      directionalIntensity: 0.3,
      hemiSky: '#e5e7eb',
      hemiGround: '#6b7280',
      hemiIntensity: 0.4,
      preset: 'dawn',
      particles: null
    },
    snow: {
      skyColor: '#e0e7ff',
      fogColor: '#e0e7ff',
      fogNear: 20,
      fogFar: 400,
      sunPosition: [0, 10, -50],
      ambientIntensity: 0.4,
      directionalIntensity: 0.5,
      hemiSky: '#e0e7ff',
      hemiGround: '#f3f4f6',
      hemiIntensity: 0.5,
      preset: 'dawn',
      particles: 'snow'
    },
    night: {
      skyColor: '#030712',
      fogColor: '#030712',
      fogNear: 50,
      fogFar: 1000,
      sunPosition: [-30, -50, 30],
      ambientIntensity: 0.03,
      directionalIntensity: 0.05,
      hemiSky: '#1e1b4b',
      hemiGround: '#030712',
      hemiIntensity: 0.08,
      preset: 'night',
      particles: null
    },
    desert: {
      skyColor: '#fde68a',
      fogColor: '#fcd34d',
      fogNear: 50,
      fogFar: 800,
      sunPosition: [100, 100, 0],
      ambientIntensity: 0.8,
      directionalIntensity: 1.5,
      hemiSky: '#fef3c7',
      hemiGround: '#d97706',
      hemiIntensity: 0.6,
      preset: 'dawn',
      particles: null
    },
    forest: {
      skyColor: '#bbf7d0',
      fogColor: '#86efac',
      fogNear: 10,
      fogFar: 500,
      sunPosition: [30, 80, -30],
      ambientIntensity: 0.5,
      directionalIntensity: 1.0,
      hemiSky: '#dcfce3',
      hemiGround: '#14532d',
      hemiIntensity: 0.5,
      preset: 'forest',
      particles: null
    },
    coastal: {
      skyColor: '#bae6fd',
      fogColor: '#7dd3fc',
      fogNear: 100,
      fogFar: 1500,
      sunPosition: [-50, 60, 50],
      ambientIntensity: 0.7,
      directionalIntensity: 1.2,
      hemiSky: '#e0f2fe',
      hemiGround: '#0369a1',
      hemiIntensity: 0.5,
      preset: 'dawn',
      particles: null
    }
  };

  const current = configs[weatherMode] || configs.sunny;
  const lightningRef = useRef();

  useFrame(() => {
    if (weatherMode === 'storm' && lightningRef.current) {
      if (Math.random() > 0.98) {
        lightningRef.current.intensity = Math.random() * 20;
      } else {
        lightningRef.current.intensity = THREE.MathUtils.lerp(lightningRef.current.intensity, 0, 0.1);
      }
    }
  });

  return (
    <>
      <color attach="background" args={[current.skyColor]} />
      <fog attach="fog" args={[current.fogColor, current.fogNear, current.fogFar]} />

      {/* Ground plane removed here — we will render region-specific planes in EnvironmentAssets.jsx instead! */}

      {/* Distant Hills (Horizon) */}
      <mesh position={[-800, 40, -600]} castShadow>
        <sphereGeometry args={[200, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2d5a0f" roughness={1} />
      </mesh>
      <mesh position={[-400, 30, -500]} castShadow>
        <sphereGeometry args={[150, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a6e16" roughness={1} />
      </mesh>
      <mesh position={[200, 50, -700]} castShadow>
        <sphereGeometry args={[250, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2d5a0f" roughness={1} />
      </mesh>
      <mesh position={[600, 35, -550]} castShadow>
        <sphereGeometry args={[180, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a6e16" roughness={1} />
      </mesh>

      {/* Sky */}
      {weatherMode !== 'night' && weatherMode !== 'storm' && (
         <Sky sunPosition={current.sunPosition} turbidity={weatherMode === 'fog' ? 5 : 0.6} rayleigh={weatherMode === 'sunny' ? 0.5 : 2} mieCoefficient={0.005} mieDirectionalG={0.8} />
      )}
      
      <Environment preset={current.preset} />
      
      {/* Hemisphere Light for natural sky-ground bounce */}
      <hemisphereLight args={[current.hemiSky, current.hemiGround, current.hemiIntensity]} />
      <ambientLight intensity={current.ambientIntensity} />
      
      <directionalLight 
        position={current.sunPosition} 
        intensity={current.directionalIntensity} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />

      {/* Lightning */}
      {weatherMode === 'storm' && (
        <directionalLight ref={lightningRef} position={[0, 100, 0]} color="#ffffff" intensity={0} />
      )}

      {/* Rain/Snow Particles */}
      {current.particles === 'rain' && (
        <group position={[0, 50, 0]}>
          <Sparkles count={5000} scale={[400, 100, 400]} size={2} speed={8} opacity={0.5} color="#a1a1aa" />
        </group>
      )}
      {current.particles === 'snow' && (
        <group position={[0, 50, 0]}>
          <Sparkles count={8000} scale={[400, 100, 400]} size={3} speed={2} opacity={0.8} color="#ffffff" />
        </group>
      )}

      {/* Night Mode: Moon Light */}
      {weatherMode === 'night' && (
        <pointLight position={[100, 200, -100]} color="#c4b5fd" intensity={0.5} distance={2000} />
      )}
    </>
  );
}
