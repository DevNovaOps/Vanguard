import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import KPICard from '../../components/common/KPICard';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import { safetyKPIs, complianceTrendData, incidentSeverityData, violations } from '../../data/mockData';
import { timeAgo } from '../../utils/helpers';
import { FileText, CheckCircle } from 'lucide-react';

export default function SafetyDashboard() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Safety Officer Dashboard</h1>
          <p>Risk and compliance monitoring</p>
        </div>
        <div className="page-actions">
          <motion.button className="btn btn-secondary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <CheckCircle size={14} /> Audit Compliance
          </motion.button>
          <motion.button className="btn btn-primary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <FileText size={14} /> Safety Report
          </motion.button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {safetyKPIs.map((kpi, i) => (
          <KPICard key={kpi.label} {...kpi} delay={i * 80} />
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Compliance Trend */}
        <div className="col-8">
          <ChartCard title="Compliance Score Trend" subtitle="Monthly compliance performance">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={complianceTrendData}>
                <defs>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                <Line type="monotone" dataKey="score" stroke="var(--color-accent-500)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-accent-500)', strokeWidth: 0 }} name="Score %" activeDot={{ r: 6, stroke: 'var(--color-accent-300)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="violations" stroke="var(--color-danger)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Violations" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Incident Severity */}
        <div className="col-4">
          <ChartCard title="Incident Severity" subtitle="Distribution by severity level">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={incidentSeverityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {incidentSeverityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {incidentSeverityData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}40` }} />
                  {item.name}
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Active Violations */}
        <div className="col-12">
          <ChartCard title="Active Violations" subtitle="Compliance rule breaches requiring attention">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Rule</th>
                    <th>Asset</th>
                    <th>Value</th>
                    <th>Threshold</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v.id}</td>
                      <td style={{ fontWeight: 'var(--font-medium)' }}>{v.ruleName}</td>
                      <td>{v.assetName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', fontWeight: 'var(--font-semibold)', textShadow: '0 0 8px rgba(220,38,38,0.2)' }}>{v.value}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{v.threshold}</td>
                      <td><StatusBadge status={v.severity} dot /></td>
                      <td><StatusBadge status={v.status} /></td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v.detectedAt)}</td>
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
