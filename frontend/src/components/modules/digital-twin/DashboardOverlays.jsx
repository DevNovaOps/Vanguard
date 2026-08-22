import React from 'react';
import { Html } from '@react-three/drei';
import { useDigitalTwin } from './DigitalTwinContext';
import { X, Activity, Battery, Zap, AlertTriangle } from 'lucide-react';

export default function DashboardOverlays() {
  const { activeDashboard, setActiveDashboard, activeEmergency } = useDigitalTwin();

  if (!activeDashboard) return null;

  const getDashboardContent = () => {
    if (activeDashboard === 'Bearing') {
      const isFailing = activeEmergency === 'BearingFailure';
      return (
        <div className="dt-dashboard">
          <div className="dt-dash-header">
            <h3><Activity size={18} /> Bearing Monitoring</h3>
            <button onClick={() => setActiveDashboard(null)}><X size={16} /></button>
          </div>
          <div className="dt-dash-body">
            <div className={`dt-stat-box ${isFailing ? 'critical' : ''}`}>
              <span className="dt-label">Temperature</span>
              <span className="dt-value">{isFailing ? '145.2' : '45.2'} °C</span>
            </div>
            <div className={`dt-stat-box ${isFailing ? 'critical' : ''}`}>
              <span className="dt-label">Vibration</span>
              <span className="dt-value">{isFailing ? '12.4' : '2.1'} mm/s</span>
            </div>
            <div className="dt-stat-box warning">
              <span className="dt-label">Lubrication</span>
              <span className="dt-value">42% (Low)</span>
            </div>
            
            <div className="dt-ai-prediction">
              <div className="dt-ai-title">AI Prediction</div>
              <div>RUL: {isFailing ? '< 1 Hour' : '4,500 Hours'}</div>
              <div>Status: {isFailing ? <span style={{color: 'red'}}>Critical</span> : <span style={{color: 'green'}}>Healthy</span>}</div>
            </div>
          </div>
        </div>
      );
    }
    
    if (activeDashboard === 'Power') {
      return (
        <div className="dt-dashboard">
          <div className="dt-dash-header">
            <h3><Zap size={18} /> Power Monitoring</h3>
            <button onClick={() => setActiveDashboard(null)}><X size={16} /></button>
          </div>
          <div className="dt-dash-body">
            <div className="dt-stat-box">
              <span className="dt-label">Voltage</span>
              <span className="dt-value">25.0 kV</span>
            </div>
            <div className="dt-stat-box">
              <span className="dt-label">Current</span>
              <span className="dt-value">240 A</span>
            </div>
            <div className="dt-stat-box">
              <span className="dt-label">Power Factor</span>
              <span className="dt-value">0.95</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeDashboard === 'Engine') {
      const isFire = activeEmergency === 'EngineFire';
      return (
        <div className="dt-dashboard">
          <div className="dt-dash-header">
            <h3><Battery size={18} /> Engine Diagnostics</h3>
            <button onClick={() => setActiveDashboard(null)}><X size={16} /></button>
          </div>
          <div className="dt-dash-body">
            <div className={`dt-stat-box ${isFire ? 'critical' : ''}`}>
              <span className="dt-label">Core Temp</span>
              <span className="dt-value">{isFire ? '250' : '85'} °C</span>
            </div>
            {isFire && (
              <div className="dt-ai-prediction" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid red' }}>
                <div className="dt-ai-title"><AlertTriangle size={14} /> Thermal Runaway Detected</div>
                <div>Confidence: 99%</div>
                <div>Action: Trigger Halon System immediately.</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="dt-dashboard">
        <div className="dt-dash-header">
          <h3>{activeDashboard} Dashboard</h3>
          <button onClick={() => setActiveDashboard(null)}><X size={16} /></button>
        </div>
        <div className="dt-dash-body" style={{ padding: '20px', textAlign: 'center' }}>
          Data syncing...
        </div>
      </div>
    );
  };

  return (
    <Html fullscreen zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        
        {/* CSS embedded for the Dashboards to keep it modular and not touch global CSS */}
        <style dangerouslySetInnerHTML={{__html: `
          .dt-dashboard {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 350px;
            background: rgba(17, 24, 39, 0.9);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: white;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            pointer-events: auto;
            overflow: hidden;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .dt-dash-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.4);
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .dt-dash-header h3 {
            margin: 0;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #e5e7eb;
          }
          .dt-dash-header button {
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
          }
          .dt-dash-header button:hover {
            background: rgba(255,255,255,0.1);
            color: white;
          }
          .dt-dash-body {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .dt-stat-box {
            display: flex;
            justify-content: space-between;
            background: rgba(255,255,255,0.03);
            padding: 10px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.05);
          }
          .dt-stat-box.critical {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.4);
            color: #fca5a5;
          }
          .dt-stat-box.warning {
            background: rgba(245, 158, 11, 0.15);
            border-color: rgba(245, 158, 11, 0.4);
            color: #fcd34d;
          }
          .dt-label {
            color: #9ca3af;
            font-size: 13px;
          }
          .dt-value {
            font-weight: 600;
            font-family: monospace;
            font-size: 14px;
          }
          .dt-ai-prediction {
            margin-top: 8px;
            padding: 12px;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 6px;
            font-size: 12px;
            color: #d1d5db;
          }
          .dt-ai-title {
            color: #60a5fa;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
        `}} />
        
        {getDashboardContent()}
      </div>
    </Html>
  );
}
