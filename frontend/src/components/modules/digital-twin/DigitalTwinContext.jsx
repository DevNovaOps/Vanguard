import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const DigitalTwinContext = createContext();

// Static mappings (defined outside component to avoid recreation)
const MAP_WEATHER = {
  sunny: 'sunny', rain: 'rain', snow: 'snow', desert: 'desert',
  fog: 'fog', forest: 'forest', mountain: 'sunny', coastal: 'coastal', storm: 'storm'
};
const MAP_ENV_NAMES = {
  sunny: 'Plains', rain: 'Rain', snow: 'Snow', desert: 'Desert',
  fog: 'Fog', forest: 'Forest', mountain: 'Mountain', coastal: 'Coastal', storm: 'Storm'
};

/**
 * DigitalTwinProvider — Central state for the Digital Twin scene.
 *
 * - `activeMap`: controls which map preset is loaded (sunny, rain, snow, etc.)
 * - Auto-syncs `weatherMode` and `currentEnvironment` when `activeMap` changes.
 * - Syncs from external `twinState` prop (from CommandCenter).
 */
export function DigitalTwinProvider({ children, twinState, restoredState, onStateCapture }) {
  const [cameraView, setCameraView] = useState(restoredState?.cameraView || 'isometric');
  const [weatherMode, setWeatherMode] = useState(restoredState?.weatherMode || 'sunny');
  const [activeEmergency, setActiveEmergency] = useState(restoredState?.activeEmergency || null);
  const [activeDashboard, setActiveDashboard] = useState(restoredState?.activeDashboard || null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [activeToolbarMenu, setActiveToolbarMenu] = useState(null);
  const [weatherOverride, setWeatherOverride] = useState(restoredState?.weatherOverride || null);
  const [activeMap, setActiveMap] = useState(restoredState?.activeMap || 'sunny');
  const [currentEnvironment, setCurrentEnvironment] = useState(restoredState?.currentEnvironment || 'Plains');

  // ── Map → Weather/Environment Sync ──
  useEffect(() => {
    setWeatherMode(MAP_WEATHER[activeMap] || 'sunny');
    setCurrentEnvironment(MAP_ENV_NAMES[activeMap] || 'Plains');
  }, [activeMap]);

  // ── Sync from external twinState (CommandCenter) ──
  // Use a ref to track previous twinState to avoid unnecessary state updates
  const prevTwinRef = useRef(twinState);
  useEffect(() => {
    if (!twinState) return;
    const prev = prevTwinRef.current;
    prevTwinRef.current = twinState;

    // Only update if values actually changed (compare with previous twinState, not internal state)
    if (twinState.cameraView && twinState.cameraView !== prev?.cameraView) {
      setCameraView(twinState.cameraView);
    }
    if (twinState.activeEmergency !== undefined && twinState.activeEmergency !== prev?.activeEmergency) {
      setActiveEmergency(twinState.activeEmergency);
    }
    if (twinState.activeDashboard !== undefined && twinState.activeDashboard !== prev?.activeDashboard) {
      setActiveDashboard(twinState.activeDashboard);
    }
    if (twinState.weatherOverride !== undefined && twinState.weatherOverride !== prev?.weatherOverride) {
      setWeatherOverride(twinState.weatherOverride);
    }
    if (twinState.activeMap && twinState.activeMap !== prev?.activeMap) {
      setActiveMap(twinState.activeMap);
    }
  }, [twinState]);

  // ── Expose capture function to parent via callback ──
  // Use refs to avoid re-triggering the effect when state changes
  const stateRef = useRef();
  stateRef.current = { cameraView, weatherMode, activeEmergency, currentEnvironment, activeDashboard, weatherOverride, activeMap };

  useEffect(() => {
    if (onStateCapture) {
      return onStateCapture(() => ({
        twin: { ...stateRef.current }
      }));
    }
  }, [onStateCapture]);

  // ── Restore state when restoredState changes (context switch) ──
  useEffect(() => {
    if (restoredState) {
      setCameraView(restoredState.cameraView || 'isometric');
      setWeatherMode(restoredState.weatherMode || 'sunny');
      setWeatherOverride(restoredState.weatherOverride || null);
      setActiveEmergency(restoredState.activeEmergency || null);
      setCurrentEnvironment(restoredState.currentEnvironment || 'Plains');
      setActiveDashboard(restoredState.activeDashboard || null);
      setActiveMap(restoredState.activeMap || 'sunny');
    }
  }, [restoredState]);

  const value = {
    twinState,
    cameraView, setCameraView,
    weatherMode, setWeatherMode,
    weatherOverride, setWeatherOverride,
    activeEmergency, setActiveEmergency,
    activeDashboard, setActiveDashboard,
    showAIPanel, setShowAIPanel,
    activeToolbarMenu, setActiveToolbarMenu,
    currentEnvironment, setCurrentEnvironment,
    activeMap, setActiveMap,
  };

  return (
    <DigitalTwinContext.Provider value={value}>
      {children}
    </DigitalTwinContext.Provider>
  );
}

export function useDigitalTwin() {
  return useContext(DigitalTwinContext);
}
