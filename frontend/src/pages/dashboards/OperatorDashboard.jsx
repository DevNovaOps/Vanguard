import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import KPICard from '../../components/common/KPICard';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import { operatorKPIs, incidents, sensors, routes } from '../../data/mockData';
import { timeAgo } from '../../utils/helpers';
import { Eye, AlertCircle, ArrowUpRight } from 'lucide-react';

const sensorByType = ['temperature', 'vibration', 'pressure', 'gas', 'power', 'signal'].map(type => ({
  type: type.charAt(0).toUpperCase() + type.slice(1),
  count: sensors.filter(s => s.type === type).length,
  warnings: sensors.filter(s => s.type === type && s.status !== 'normal').length,
}));

export default function OperatorDashboard() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Operator Dashboard</h1>
          <p>Railway operations monitoring center</p>
        </div>
        <div className="page-actions">
          <span className="live-indicator">LIVE</span>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {operatorKPIs.map((kpi, i) => (
          <KPICard key={kpi.label} {...kpi} delay={i * 80} />
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Sensor Distribution */}
        <div className="col-8">
          <ChartCard title="Sensor Distribution" subtitle="Sensors by type with warnings">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sensorByType} barGap={8}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="warnings" fill="var(--color-warning)" radius={[6, 6, 0, 0]} name="Warnings" opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Active Routes */}
        <div className="col-4">
          <ChartCard title="Active Routes" subtitle={`${routes.length} routes monitored`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
              {routes.map((route, i) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-lg)', transition: 'all 200ms ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{route.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{route.distance} km</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 40, height: 4, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${route.load}%`, height: '100%',
                        background: route.load > 85 ? 'var(--color-danger)' : route.load > 70 ? 'var(--color-warning)' : 'var(--color-success)',
                        borderRadius: 4, boxShadow: route.load > 85 ? '0 0 6px rgba(220,38,38,0.4)' : 'none',
                      }} />
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 30 }}>{route.load}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Incident Queue */}
        <div className="col-12">
          <ChartCard title="Incident Queue" subtitle="Active incidents sorted by priority">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Severity</th>
                    <th>Title</th>
                    <th>Asset</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 5).map(inc => (
                    <tr key={inc.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{inc.id}</td>
                      <td><StatusBadge status={inc.severity} dot /></td>
                      <td style={{ fontWeight: 'var(--font-medium)' }}>{inc.title}</td>
                      <td>{inc.assetName}</td>
                      <td>
                        <span style={{
                          fontWeight: 'var(--font-bold)',
                          color: inc.riskScore >= 80 ? 'var(--color-danger)' : inc.riskScore >= 50 ? 'var(--color-warning)' : 'var(--text-primary)',
                          textShadow: inc.riskScore >= 80 ? '0 0 8px rgba(220,38,38,0.3)' : 'none',
                        }}>{inc.riskScore}</span>
                      </td>
                      <td><StatusBadge status={inc.status} /></td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(inc.createdAt)}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm"><Eye size={14} /></button>
                        <button className="btn btn-ghost btn-sm"><ArrowUpRight size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
