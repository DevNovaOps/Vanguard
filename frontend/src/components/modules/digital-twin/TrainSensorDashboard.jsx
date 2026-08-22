import React from 'react';
import { TRAIN_TYPES } from './TrainAssets';

export default function TrainSensorDashboard({ selectedTrainId, sensorData }) {
  if (!sensorData) return <div style={{ color: '#64748b', fontSize: '12px' }}>Loading sensors...</div>;

  const config = TRAIN_TYPES[selectedTrainId];
  if (!config) return null;

  const renderSensor = (sensor) => {
    let color = '#10b981'; // healthy
    if (sensor.status === 'warning') color = '#f59e0b';
    if (sensor.status === 'critical') color = '#ef4444';

    return (
      <div key={sensor.id} style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: '8px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Status Indicator Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: color }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{sensor.icon}</span>
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>{sensor.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', paddingLeft: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>
            {sensor.displayValue}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>{sensor.unit}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {sensorData.engine && sensorData.engine.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 'bold' }}>
            Locomotive Telemetry
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {sensorData.engine.map(renderSensor)}
          </div>
        </div>
      )}

      {sensorData.coach && sensorData.coach.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 'bold' }}>
            Rake / Consist Telemetry
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {sensorData.coach.map(renderSensor)}
          </div>
        </div>
      )}

    </div>
  );
}
