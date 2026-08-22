import React from 'react';
import { useDigitalTwin } from './DigitalTwinContext';

/**
 * DigitalTwinUI — Simplified
 * 
 * The camera/weather/emergency controls have been moved to the 
 * floating bottom dock in CommandCenter.jsx. This component is 
 * kept as a no-op shell so the render tree in Train3DModel.jsx
 * doesn't break.
 */
export default function DigitalTwinUI() {
  // Context is still consumed so the provider doesn't warn
  useDigitalTwin();
  return null;
}
