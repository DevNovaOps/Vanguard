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

export default function SensorOverlays({ locoPosition = [0,0,0], trackZ = 0, railHeight = 0, isLocal = false, isInfra = false, trainType = 'passenger' }) {
  const { setActiveDashboard, activeEmergency, activeMap } = useDigitalTwin();

  const [data, setData] = useState({
    // Loco
    engineTemp: 85, engineVolt: 25000, engineCurr: 400, enginePwr: 6.2, rpm: 1200, battery: 98, pantographVolt: 25, motorTemp: 75,
    bearingVib: 2.1, bearingTemp: 45,
    // LHB Coaches
    coachTemp: 22, coachHum: 40, hvacPwr: 12, passLoad: 85, doorStatus: 1, coachVib: 1.2,
    // Freight
    wagonLoad: 95, wagonVib: 2.8, axleStress: 60,
    // Infra
    trackStrain: 450, trackVib: 1.5, trackTemp: 32,
    bridgeVib: 0.8, bridgeHealth: 98, bridgeTilt: 0,
    tunnelGas: 0.01, tunnelSmoke: 0, tunnelHum: 65,
    oheVolt: 25.0, oheCurr: 240, ohePwr: 6.0, transformerTemp: 60,
    // Weather
    weatherTemp: 32, weatherHum: 45, weatherWind: 15, visibility: 100,
    gpsSignal: 100
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setData(prev => {
        // Environment Modifiers — keyed by activeMap for precise per-map tuning
        const env = activeMap || 'sunny';
        
        let m = { temp: 0, hum: 0, vib: 0, volt: 0, pwr: 0, wind: 0, vis: 0, gps: 0, batt: 0 };
        
        switch (env) {
          case 'desert': m.temp = +15; m.hum = -30; m.batt = -10; m.pwr = +1.5; m.wind = +20; m.vis = -20; break;
          case 'snow': m.temp = -40; m.batt = -25; m.vib = +0.5; m.wind = +10; m.vis = -30; break;
          case 'rain': m.hum = +40; m.vib = +0.8; m.vis = -40; break;
          case 'storm': m.hum = +50; m.vib = +1.5; m.vis = -60; m.wind = +50; m.pwr = +1.0; break;
          case 'fog': m.hum = +30; m.vis = -80; m.gps = -20; break;
          case 'forest': m.hum = +20; m.vis = -10; break;
          case 'mountain': m.pwr = +2.5; m.temp = -10; m.batt = -5; m.vib = +0.3; break;
          case 'coastal': m.hum = +25; m.wind = +35; m.vib = +0.6; break;
          case 'sunny': default: break;
        }

        // Apply specific emergencies
        const isFire = activeEmergency === 'EngineFire';
        const isBearing = activeEmergency === 'BearingFailure';
        const isCrack = activeEmergency === 'TrackCrack';

        return {
          engineTemp: isFire ? Math.min(200, prev.engineTemp + 2) : 85 + m.temp + Math.random() * 5,
          motorTemp: isFire ? Math.min(180, prev.motorTemp + 1.5) : 75 + (m.temp * 0.8) + Math.random() * 4,
          engineVolt: 25000 + m.volt + Math.random() * 500,
          engineCurr: 400 + (m.pwr * 20) + Math.random() * 20,
          enginePwr: 6.2 + m.pwr + Math.random() * 0.5,
          rpm: 1200 + Math.random() * 50,
          battery: 98 + m.batt - Math.random(),
          pantographVolt: 25 + Math.random() * 0.5,
          
          bearingVib: isBearing ? Math.min(15, prev.bearingVib + 0.5) : 1.5 + m.vib + Math.random(),
          bearingTemp: isBearing ? Math.min(180, prev.bearingTemp + 2) : 45 + (m.temp * 0.5) + Math.random() * 3,
          
          coachTemp: 22 + Math.random() * 2,
          coachHum: 40 + (m.hum * 0.2) + Math.random() * 5,
          hvacPwr: 12 + (m.temp > 10 ? 4 : 0) + Math.random() * 2,
          passLoad: 85 + Math.random() * 5,
          doorStatus: 1, // closed
          coachVib: 1.2 + m.vib + Math.random() * 0.3,
          
          wagonLoad: 95 + Math.random() * 2,
          wagonVib: 2.8 + m.vib * 1.5 + Math.random(),
          axleStress: 60 + m.vib * 10 + Math.random() * 5,
          
          trackStrain: isCrack ? 900 + Math.random() * 100 : 450 + Math.random() * 50,
          trackVib: isCrack ? 12 + Math.random() : 1.5 + m.vib + Math.random(),
          trackTemp: 32 + m.temp + Math.random() * 2,
          
          bridgeVib: 0.8 + m.vib + Math.random() * 0.2,
          bridgeHealth: prev.bridgeHealth - (m.hum > 20 ? 0.01 : 0),
          bridgeTilt: m.wind > 20 ? 0.1 + Math.random() * 0.1 : 0,
          
          tunnelGas: env === 'tunnel' ? 0.05 + Math.random() * 0.02 : 0,
          tunnelSmoke: env === 'tunnel' ? (isFire ? 80 : 5) + Math.random() * 2 : 0,
          tunnelHum: 65 + m.hum + Math.random() * 5,
          
          oheVolt: 25.0 + Math.random() * 0.4,
          oheCurr: 240 + (m.pwr * 10) + Math.random() * 10,
          ohePwr: 6.0 + Math.random() * 0.2,
          transformerTemp: 60 + m.temp + Math.random() * 5,
          
          weatherTemp: 32 + m.temp + (Math.random() - 0.5),
          weatherHum: 45 + m.hum + Math.random() * 2,
          weatherWind: 15 + m.wind + Math.random() * 5,
          visibility: 100 + m.vis,
          gpsSignal: 100 + m.gps
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeEmergency, activeMap]);

  // Train Specific UI logic
  const getLocoTags = () => {
    return [
      { id: 'engineTemp', label: 'Engine', val: `${data.engineTemp.toFixed(1)}`, unit: '°C', x: 2, y: 15, stat: data.engineTemp > 120 ? 'critical' : data.engineTemp > 100 ? 'warning' : 'healthy', icon: '🌡️' },
      { id: 'enginePwr', label: 'Power', val: `${data.enginePwr.toFixed(1)}`, unit: 'MW', x: -2, y: 15, stat: 'healthy', icon: '⚡' },
      { id: 'bearing', label: 'Bearing', val: `${data.bearingTemp.toFixed(1)}`, unit: '°C', x: 0, y: 2.5, stat: data.bearingTemp > 90 ? 'critical' : data.bearingTemp > 70 ? 'warning' : 'healthy', icon: '⚙️' },
      { id: 'motor', label: 'Motor', val: `${data.motorTemp.toFixed(1)}`, unit: '°C', x: 2, y: 5, stat: data.motorTemp > 120 ? 'critical' : 'healthy', icon: '🔥' },
      { id: 'battery', label: 'Battery', val: `${data.battery.toFixed(1)}`, unit: '%', x: -2, y: 5, stat: data.battery < 50 ? 'warning' : 'healthy', icon: '🔋' }
    ];
  };

  const getCoachTags = () => {
    if (trainType === 'freight') {
      return [
        { id: 'load', label: 'Load', val: `${data.wagonLoad.toFixed(1)}`, unit: 't', x: -10, y: 10, stat: 'healthy', icon: '📦' },
        { id: 'axle', label: 'Axle Stress', val: `${data.axleStress.toFixed(1)}`, unit: 'MPa', x: -10, y: 5, stat: data.axleStress > 100 ? 'warning' : 'healthy', icon: '⚖️' }
      ];
    } else {
      return [
        { id: 'hvac', label: 'HVAC', val: `${data.coachTemp.toFixed(1)}`, unit: '°C', x: -10, y: 12, stat: 'healthy', icon: '❄️' },
        { id: 'pax', label: 'Load', val: `${data.passLoad.toFixed(0)}`, unit: '%', x: -12, y: 8, stat: 'healthy', icon: '👥' },
        { id: 'vib', label: 'Vibration', val: `${data.coachVib.toFixed(2)}`, unit: 'g', x: -10, y: 2.5, stat: 'healthy', icon: '📳' }
      ];
    }
  };

  const getInfraTags = () => {
    return [
      { id: 'track', label: 'Strain', val: `${data.trackStrain.toFixed(0)}`, unit: 'με', x: locoPosition[0], y: 1, z: trackZ + 5, stat: data.trackStrain > 800 ? 'critical' : 'healthy' },
      { id: 'ohe', label: 'OHE', val: `${data.oheVolt.toFixed(1)}`, unit: 'kV', x: locoPosition[0] - 10, y: 18, z: trackZ + 5, stat: 'healthy' }
    ];
  };

  const x = locoPosition[0];
  const z = trackZ;

  if (isLocal) {
    return (
      <group position={locoPosition}>
        {getLocoTags().map(t => (
          <SensorTag key={t.id} position={[t.x, t.y, 0]} label={t.label} value={t.val} unit={t.unit} status={t.stat} icon={t.icon} onClick={() => setActiveDashboard('Engine')} />
        ))}
        {getCoachTags().map(t => (
          <SensorTag key={t.id} position={[t.x, t.y, 0]} label={t.label} value={t.val} unit={t.unit} status={t.stat} icon={t.icon} onClick={() => setActiveDashboard('Coaches')} />
        ))}
      </group>
    );
  }

  if (isInfra) {
    return (
      <group>
        {getInfraTags().map(t => (
          <SensorTag key={t.id} position={[t.x, t.y, t.z]} label={t.label} value={t.val} unit={t.unit} status={t.stat} onClick={() => setActiveDashboard('Track')} />
        ))}
      </group>
    );
  }

  return null;
}
