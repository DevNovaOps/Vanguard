import { useMemo } from 'react';
import * as THREE from 'three';

// Calculate BoundingBox & BoundingSphere, center pivot, normalize scale
export function useModelBounds(gltf, targetLength = null, baseRotation = [0, 0, 0]) {
  return useMemo(() => {
    if (!gltf || !gltf.scene) return null;
    const clone = gltf.scene.clone(true);
    
    clone.rotation.set(...baseRotation);
    clone.scale.setScalar(1);
    clone.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(clone);
    if (box.isEmpty()) return null;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    let scale = 1;
    if (targetLength) {
      const maxLength = Math.max(size.x, size.z);
      if (maxLength > 0) {
        scale = targetLength / maxLength;
      }
    }

    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    const group = new THREE.Group();
    group.add(clone);

    const finalBox = new THREE.Box3().setFromObject(group);
    const finalSize = new THREE.Vector3();
    finalBox.getSize(finalSize);

    return { 
      scene: group, 
      size: finalSize, 
      min: finalBox.min, 
      max: finalBox.max,
      scale 
    };
  }, [gltf, targetLength, baseRotation]);
}
