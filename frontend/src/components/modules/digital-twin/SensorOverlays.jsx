import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useDigitalTwin } from './DigitalTwinContext';

const SensorTag = ({ position, label, value, unit, status, onClick, icon }) => {
  const colors = {
    critical: { text: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
    warning:  { text: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    healthy:  { text: '#94a3b8', bg: 'rgba(10,15,30,0.7)', border: 'rgba(255,255,255,0.08)' }
  };
  const c = colors[status] || colors.healthy;

  return (
    <Html position={position} center zIndexRange={[100, 0]}>
      <div
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: c.bg, backdropFilter: 'blur(6px)',
          border: `1px solid ${c.border}`, borderRadius: '6px',
          padding: '3px 8px', cursor: 'pointer', pointerEvents: 'auto',
          whiteSpace: 'nowrap', transition: 'all 0.2s',
          transform: 'translateY(-8px)'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-10px) scale(1.08)'; e.currentTarget.style.borderColor = c.text; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(-8px) scale(1)'; e.currentTarget.style.borderColor = c.border; }}
      >
        {icon && <span style={{ fontSize: '11px' }}>{icon}</span>}
        <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: c.text }}>
          {value}
        </span>
        <span style={{ fontSize: '9px', color: '#64748b' }}>{unit}</span>
      </div>
    </Html>
  );
};

export default function SensorOverlays({ locoPosition, trackZ, railHeight }) {
  const { setActiveDashboard, activeEmergency, currentEnvironment } = useDigitalTwin();

  // Simulated oscillating values
  const [data, setData] = useState({
    engineTemp: 85,
    engineVolt: 750,
    engineCurr: 400,
    enginePwr: 300,
    bearingVib: 2.1,
    bearingTemp: 45,
    trackStrain: 450,
    trackVib: 1.5,
    bridgeVib: 0.8,
    bridgeHealth: 98,
    tunnelGas: 0.01,
    tunnelSmoke: 0,
    tunnelHum: 65,
    weatherTemp: 32,
    weatherHum: 45,
    weatherWind: 15,
    oheVolt: 25.0,
    oheCurr: 240,
    ohePwr: 6.0,
    gpsSignal: 100
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setData(prev => {
        // Base values modified by environment
        let envMotorTempMod = currentEnvironment === 'Desert' ? +25 : currentEnvironment === 'Snow' ? -15 : 0;
        let envWheelSlipMod = currentEnvironment === 'Snow' ? +3 : currentEnvironment === 'Rain Forest' ? +1.5 : 0;
        let envBridgeVibMod = currentEnvironment === 'Coastal' && locoPosition[0] > -300 && locoPosition[0] < -100 ? +1.2 : 0;
        let envHumidMod = currentEnvironment === 'Rain Forest' ? +25 : currentEnvironment === 'Desert' ? -30 : currentEnvironment === 'Tunnel' ? +20 : 0;
        let envGpsMod = currentEnvironment === 'Tunnel' ? -80 : 0; // Simulated signal drop

        return {
          engineTemp: activeEmergency === 'EngineFire' ? Math.min(180, prev.engineTemp + Math.random() * 5) : (80 + envMotorTempMod) + Math.random() * 10,
          engineVolt: 750 + Math.random() * 20,
          engineCurr: (currentEnvironment === 'Snow' ? 500 : 400) + Math.random() * 50,
          enginePwr: (currentEnvironment === 'Desert' ? 320 : 300) + Math.random() * 10,
          bearingVib: activeEmergency === 'BearingFailure' ? Math.min(15, prev.bearingVib + Math.random()) : (1.5 + envWheelSlipMod) + Math.random(),
          bearingTemp: activeEmergency === 'BearingFailure' ? Math.min(150, prev.bearingTemp + Math.random() * 5) : 45 + Math.random() * 5,
          trackStrain: activeEmergency === 'TrackCrack' ? 900 + Math.random() * 100 : (currentEnvironment === 'Coastal' ? 500 : 400) + Math.random() * 50,
          trackVib: activeEmergency === 'TrackCrack' ? 12 + Math.random() : 1.5 + Math.random(),
          bridgeVib: (0.8 + envBridgeVibMod) + Math.random() * 0.2,
          bridgeHealth: 98 - Math.random() * 0.1,
          tunnelGas: 0.01 + Math.random() * 0.01,
          tunnelSmoke: currentEnvironment === 'Tunnel' ? 12 + Math.random() * 5 : 0,
          tunnelHum: (65 + envHumidMod) + Math.random() * 2,
          weatherTemp: (currentEnvironment === 'Desert' ? 45 : currentEnvironment === 'Snow' ? -5 : 32) + (Math.random() - 0.5),
          weatherHum: (45 + envHumidMod) + (Math.random() - 0.5),
          weatherWind: (currentEnvironment === 'Coastal' ? 45 : 15) + Math.random() * 5,
          oheVolt: 25.0 + (Math.random() - 0.5) * 0.4,
          oheCurr: 240 + Math.random() * 10,
          ohePwr: 6.0 + Math.random() * 0.2,
          gpsSignal: 100 + envGpsMod
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeEmergency, currentEnvironment, locoPosition]);

  const STATION_X = 500;
  const BRIDGE_X = -200;
  const TUNNEL_X = -600;
  const TRANSFORMER_X = 100;

  return (
    <group>
      {/* ENGINE SENSORS (Relative to Train) */}
      <group position={locoPosition}>
        <SensorTag position={[-5, 5, 2]} icon="🌡" value={data.engineTemp.toFixed(0)} unit="°C"
          status={data.engineTemp > 120 ? 'critical' : data.engineTemp > 90 ? 'warning' : 'healthy'}
          onClick={() => setActiveDashboard('Engine')} />
        <SensorTag position={[-5, 6.5, 2]} icon="⚡" value={data.enginePwr.toFixed(0)} unit="kW"
          status="healthy" onClick={() => setActiveDashboard('Engine')} />
        <SensorTag position={[-15, 2, 2]} icon="📳" value={data.bearingVib.toFixed(2)} unit="mm/s"
          status={data.bearingVib > 8 ? 'critical' : data.bearingVib > 5 ? 'warning' : 'healthy'}
          onClick={() => setActiveDashboard('Bearing')} />
        <SensorTag position={[-15, 1, 2]} icon="🌡" value={data.bearingTemp.toFixed(0)} unit="°C"
          status={data.bearingTemp > 90 ? 'critical' : 'healthy'}
          onClick={() => setActiveDashboard('Bearing')} />
        <SensorTag position={[-25, 8, 2]} icon="📡" value={data.gpsSignal.toFixed(0)} unit="%"
          status={data.gpsSignal < 30 ? 'critical' : data.gpsSignal < 60 ? 'warning' : 'healthy'}
          onClick={() => {}} />
      </group>

      {/* TRACK SENSORS */}
      <SensorTag position={[0, railHeight, trackZ + 2]} icon="🛤️" value={data.trackStrain.toFixed(0)} unit="με"
        status={data.trackStrain > 800 ? 'critical' : 'healthy'}
        onClick={() => setActiveDashboard('Track')} />
      <SensorTag position={[-10, railHeight, trackZ + 2]} icon="📳" value={data.trackVib.toFixed(1)} unit="mm/s"
        status={data.trackVib > 10 ? 'critical' : 'healthy'}
        onClick={() => setActiveDashboard('Track')} />

      {/* BRIDGE SENSORS */}
      <SensorTag position={[BRIDGE_X, railHeight - 5, trackZ + 6]} icon="🛡️" value={data.bridgeHealth.toFixed(1)} unit="%"
        status="healthy" onClick={() => setActiveDashboard('Bridge')} />
      <SensorTag position={[BRIDGE_X + 15, railHeight, trackZ + 6]} icon="📳" value={data.bridgeVib.toFixed(2)} unit="mm/s"
        status="healthy" onClick={() => setActiveDashboard('Bridge')} />

      {/* TUNNEL SENSORS */}
      <SensorTag position={[TUNNEL_X, railHeight + 8, trackZ + 6]} icon="💨" value={data.tunnelGas.toFixed(3)} unit="ppm"
        status="healthy" onClick={() => setActiveDashboard('Tunnel')} />
      <SensorTag position={[TUNNEL_X + 15, railHeight + 8, trackZ + 6]} icon="🔥" value={data.tunnelSmoke.toFixed(0)} unit="%"
        status="healthy" onClick={() => setActiveDashboard('Tunnel')} />

      {/* WEATHER STATION */}
      <SensorTag position={[STATION_X - 40, railHeight + 15, trackZ + 15]} icon="🌬️" value={data.weatherWind.toFixed(1)} unit="km/h"
        status="healthy" onClick={() => setActiveDashboard('Weather')} />

      {/* TRANSFORMER / YARD */}
      <SensorTag position={[STATION_X + 20, railHeight + 10, trackZ - 5]} icon="⚡" value={data.voltage?.toFixed(2) || data.oheVolt.toFixed(2)} unit="kV"
        status={data.oheVolt < 24 ? 'warning' : 'healthy'}
        onClick={() => setActiveDashboard('Power')} />
      <SensorTag position={[STATION_X + 20, railHeight + 12, trackZ - 5]} icon="🔋" value={data.ohePwr.toFixed(1)} unit="MW"
        status="healthy" onClick={() => setActiveDashboard('Power')} />
    </group>
  );
}
