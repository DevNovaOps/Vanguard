import React, { createContext, useContext, useState, useEffect } from 'react';

const DigitalTwinContext = createContext();

export function DigitalTwinProvider({ children, twinState, restoredState, onStateCapture }) {
  const [cameraView, setCameraView] = useState(restoredState?.cameraView || 'isometric');
  const [weatherMode, setWeatherMode] = useState(restoredState?.weatherMode || 'sunny');
  const [activeEmergency, setActiveEmergency] = useState(restoredState?.activeEmergency || null);
  const [activeDashboard, setActiveDashboard] = useState(restoredState?.activeDashboard || null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [activeToolbarMenu, setActiveToolbarMenu] = useState(null); // 'weather' | 'emergency' | null
  
  // Environment Zone Tracking
  const [currentEnvironment, setCurrentEnvironment] = useState(restoredState?.currentEnvironment || 'Plains'); // Plains, Desert, RainForest, Coastal, Snow, Tunnel, FogZone

  // Expose capture function to parent via callback
  useEffect(() => {
    if (onStateCapture) {
      return onStateCapture(() => ({
        twin: { cameraView, weatherMode, activeEmergency, currentEnvironment, activeDashboard }
      }));
    }
  }, [cameraView, weatherMode, activeEmergency, currentEnvironment, activeDashboard, onStateCapture]);

  // Restore state when restoredState changes (context switch)
  useEffect(() => {
    if (restoredState) {
      setCameraView(restoredState.cameraView || 'isometric');
      setWeatherMode(restoredState.weatherMode || 'sunny');
      setActiveEmergency(restoredState.activeEmergency || null);
      setCurrentEnvironment(restoredState.currentEnvironment || 'Plains');
      setActiveDashboard(restoredState.activeDashboard || null);
    }
  }, [restoredState]);

  const value = {
    twinState,
    cameraView, setCameraView,
    weatherMode, setWeatherMode,
    activeEmergency, setActiveEmergency,
    activeDashboard, setActiveDashboard,
    showAIPanel, setShowAIPanel,
    activeToolbarMenu, setActiveToolbarMenu,
    currentEnvironment, setCurrentEnvironment
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
