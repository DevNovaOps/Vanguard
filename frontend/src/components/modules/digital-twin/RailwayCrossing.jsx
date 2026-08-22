import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';

/**
 * RailwayCrossing — Animated road-rail level crossing.
 *
 * Features:
 *  - Road surface crossing the tracks
 *  - Red/white striped boom barriers (animated open/close cycle)
 *  - Blinking warning lights
 *  - Warning X-sign
 *  - Road markings (yellow lines)
 */
const RailwayCrossing = React.memo(function RailwayCrossing({
  position = [0, 0, 0],
  railHeight = 0,
  trackZ = 0,
  roadColor = '#6b7280',
  barrierColor = '#ef4444',
}) {
  const barrierLeftRef = useRef();
  const barrierRightRef = useRef();
  const light1Ref = useRef();
  const light2Ref = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Barrier oscillation: 15s open, 10s closed cycle
    const cycle = t % 25;
    const targetAngle = cycle < 15 ? 0 : -Math.PI / 2;

    if (barrierLeftRef.current) {
      barrierLeftRef.current.rotation.z = THREE.MathUtils.lerp(
        barrierLeftRef.current.rotation.z, targetAngle, 0.03
      );
    }
    if (barrierRightRef.current) {
      barrierRightRef.current.rotation.z = THREE.MathUtils.lerp(
        barrierRightRef.current.rotation.z, targetAngle, 0.03
      );
    }

    // Blinking alternating lights (when barrier is closing/closed)
    const blinking = cycle >= 13; // Start blinking 2s before close
    if (blinking) {
      const blink = Math.sin(t * 6) > 0;
      if (light1Ref.current) light1Ref.current.material.emissiveIntensity = blink ? 3 : 0.1;
      if (light2Ref.current) light2Ref.current.material.emissiveIntensity = blink ? 0.1 : 3;
    } else {
      if (light1Ref.current) light1Ref.current.material.emissiveIntensity = 0.1;
      if (light2Ref.current) light2Ref.current.material.emissiveIntensity = 0.1;
    }
  });

  // Stripe positions for barriers
  const stripes = useMemo(() => [0, 1, 2, 3, 4, 5], []);

  return (
    <group position={position}>
      {/* ── Road Surface ── */}
      <Box args={[20, 0.3, 80]} position={[0, railHeight - 0.5, trackZ]} receiveShadow>
        <meshStandardMaterial color={roadColor} roughness={0.95} />
      </Box>

      {/* ── Road Markings ── */}
      <Box args={[20, 0.32, 1]} position={[0, railHeight - 0.33, trackZ - 16]} receiveShadow>
        <meshStandardMaterial color="#fbbf24" />
      </Box>
      <Box args={[20, 0.32, 1]} position={[0, railHeight - 0.33, trackZ + 16]} receiveShadow>
        <meshStandardMaterial color="#fbbf24" />
      </Box>

      {/* ── Left Barrier Post ── */}
      <Cylinder args={[0.3, 0.3, 8]} position={[-12, railHeight + 4, trackZ - 20]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.5} />
      </Cylinder>

      {/* ── Left Barrier Arm (animated) ── */}
      <group ref={barrierLeftRef} position={[-12, railHeight + 7.5, trackZ - 20]}>
        <Box args={[0.3, 0.6, 32]} position={[0, 0, 16]} castShadow>
          <meshStandardMaterial color={barrierColor} />
        </Box>
        {stripes.map(i => (
          <Box key={`ls-${i}`} args={[0.32, 0.62, 2]} position={[0, 0, 3 + i * 5]} castShadow>
            <meshStandardMaterial color="white" />
          </Box>
        ))}
      </group>

      {/* ── Right Barrier Post ── */}
      <Cylinder args={[0.3, 0.3, 8]} position={[12, railHeight + 4, trackZ + 20]} castShadow>
        <meshStandardMaterial color="#334155" metalness={0.5} />
      </Cylinder>

      {/* ── Right Barrier Arm (animated) ── */}
      <group ref={barrierRightRef} position={[12, railHeight + 7.5, trackZ + 20]}>
        <Box args={[0.3, 0.6, 32]} position={[0, 0, -16]} castShadow>
          <meshStandardMaterial color={barrierColor} />
        </Box>
        {stripes.map(i => (
          <Box key={`rs-${i}`} args={[0.32, 0.62, 2]} position={[0, 0, -3 - i * 5]} castShadow>
            <meshStandardMaterial color="white" />
          </Box>
        ))}
      </group>

      {/* ── Warning Light Housing (left side) ── */}
      <group position={[-12, railHeight + 8.8, trackZ - 20]}>
        <Box args={[1.2, 1.8, 0.5]} castShadow>
          <meshStandardMaterial color="#0f172a" />
        </Box>
        <Sphere ref={light1Ref} args={[0.22, 8, 8]} position={[-0.28, 0.35, 0.3]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.1} />
        </Sphere>
        <Sphere ref={light2Ref} args={[0.22, 8, 8]} position={[0.28, 0.35, 0.3]}>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.1} />
        </Sphere>
        <pointLight position={[0, 0.35, 0.5]} color="#ef4444" intensity={0.5} distance={10} />
      </group>

      {/* ── Warning X-Sign (right side) ── */}
      <group position={[12, railHeight + 9.5, trackZ + 20]}>
        <Box args={[2.2, 0.3, 0.15]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <meshStandardMaterial color="#fbbf24" />
        </Box>
        <Box args={[2.2, 0.3, 0.15]} rotation={[0, 0, -Math.PI / 4]} castShadow>
          <meshStandardMaterial color="#fbbf24" />
        </Box>
      </group>

      {/* ── STOP text board ── */}
      <Box args={[3, 1.5, 0.2]} position={[-12, railHeight + 10.5, trackZ - 20]} castShadow>
        <meshStandardMaterial color="#dc2626" />
      </Box>
    </group>
  );
});

export default RailwayCrossing;
