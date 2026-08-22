import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * AnimatedRiver — Flowing water surface with animated UV scrolling and vertex ripples.
 *
 * Props:
 *   position    – [x, y, z] placement
 *   width       – river width (Z axis)
 *   length      – river length (X axis)
 *   color       – base water color (hex string)
 *   opacity     – water opacity
 *   flowSpeed   – UV scroll speed multiplier
 *   frozen      – if true, disable animation (for snow map)
 */
export default function AnimatedRiver({
  position = [0, 0, 0],
  width = 2000,
  length = 300,
  color = '#0ea5e9',
  opacity = 0.75,
  flowSpeed = 1,
  frozen = false,
}) {
  const meshRef = useRef();
  const matRef = useRef();

  // Build a custom plane with enough segments for ripple displacement
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(length, width, 64, 32);
    // Store original Y positions for ripple offset
    geo.userData.basePositions = Float32Array.from(geo.attributes.position.array);
    return geo;
  }, [length, width]);

  useFrame((state) => {
    if (frozen) return;
    const t = state.clock.elapsedTime;

    // UV scroll for flow illusion
    if (matRef.current && matRef.current.map) {
      matRef.current.map.offset.x = t * 0.04 * flowSpeed;
    }

    // Vertex ripple
    if (meshRef.current) {
      const pos = meshRef.current.geometry.attributes.position;
      const base = meshRef.current.geometry.userData.basePositions;
      if (!base) return;

      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        // Ripple on the Z axis (which is "up" after rotation)
        const ripple = Math.sin(bx * 0.05 + t * 2 * flowSpeed) * 0.3
                     + Math.sin(by * 0.08 + t * 1.5 * flowSpeed) * 0.2;
        pos.array[i * 3 + 2] = base[i * 3 + 2] + ripple;
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      geometry={geometry}
    >
      <meshStandardMaterial
        ref={matRef}
        color={frozen ? '#b0d4e8' : color}
        transparent
        opacity={frozen ? 0.95 : Math.max(0.6, opacity)}
        roughness={frozen ? 0.6 : 0.1}
        metalness={frozen ? 0.1 : 0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
