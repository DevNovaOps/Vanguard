import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import { sensors, transitNodes, generateTelemetryHistory } from '../../data/mockData';
import { getSensorTypeInfo } from '../../utils/helpers';
import { useSimulation } from '../../contexts/SimulationContext';
import { Radio } from 'lucide-react';

const SENSOR_TYPES = ['all', 'temperature', 'vibration', 'pressure', 'gas', 'power', 'signal'];

export default function TelemetryCenter() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [nodeFilter, setNodeFilter] = useState('all');
  const [telemetryData] = useState(() => generateTelemetryHistory(6));
  const [liveSensors, setLiveSensors] = useState(sensors);
  const { isRunning, currentStep } = useSimulation();

  // Simulate live updates during simulation
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setLiveSensors(prev => prev.map(s => ({
        ...s,
        value: s.type === 'temperature'
          ? s.value + (Math.random() - 0.3) * 2
          : s.value + (Math.random() - 0.5) * 0.5,
        status: s.type === 'temperature' && s.value > s.threshold * 0.85 ? 'warning' : s.status,
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const filtered = liveSensors.filter(s => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (nodeFilter !== 'all' && s.nodeId !== nodeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const chartColors = {
    temperature: '#DC2626', vibration: '#D97706', pressure: '#2563EB',
    gas: '#059669', power: '#7C3AED', signal: '#0D9488',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Radio size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Telemetry Center</span></h1>
          <p>Live sensor monitoring and historical trends</p>
        </div>
        <div className="page-actions">
          <span className="telemetry-live-badge">LIVE</span>
        </div>
      </div>

      {/* Live Charts */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        {['temperature', 'vibration', 'power'].map((type, idx) => {
          const info = getSensorTypeInfo(type);
          return (
            <div className="col-4" key={type}>
              <ChartCard title={info.label} subtitle={`Live ${info.unit} readings`}>
                <div style={{ position: 'relative' }}>
                  <span className="telemetry-live-badge" style={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>STREAMING</span>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={telemetryData.slice(-20)}>
                      <defs>
                        <linearGradient id={`telGrad-${type}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColors[type]} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={chartColors[type]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--chart-text)' }} axisLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '11px', backdropFilter: 'blur(20px)' }} />
                      <Line type="monotone" dataKey={type} stroke={chartColors[type]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search sensors..." />
        <select className="select" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {SENSOR_TYPES.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select className="select" style={{ width: 'auto' }} value={nodeFilter} onChange={e => setNodeFilter(e.target.value)}>
          <option value="all">All Nodes</option>
          {transitNodes.map(n => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>

      {/* Sensor Feed Table */}
      <motion.div
        className="data-table-wrapper"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Sensor ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Node</th>
              <th>Value</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sensor => {
              const info = getSensorTypeInfo(sensor.type);
              const node = transitNodes.find(n => n.id === sensor.nodeId);
              const pct = (sensor.value / sensor.threshold) * 100;
              const isBreach = pct >= 90;
              return (
                <tr key={sensor.id} className={isBreach ? 'threshold-breach' : ''}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{sensor.id}</td>
                  <td style={{ fontWeight: 'var(--font-medium)' }}>{sensor.name}</td>
                  <td>
                    <span className="badge badge-neutral">{info.label}</span>
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>{node?.name || sensor.nodeId}</td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-bold)',
                      color: pct >= 90 ? 'var(--color-danger)' : pct >= 75 ? 'var(--color-warning)' : 'var(--text-primary)',
                      textShadow: pct >= 90 ? '0 0 8px rgba(220,38,38,0.3)' : 'none',
                    }}>
                      {sensor.value.toFixed(1)} {info.unit}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                    {sensor.threshold} {info.unit}
                  </td>
                  <td><StatusBadge status={sensor.status} dot /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
