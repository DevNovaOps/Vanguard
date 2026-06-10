import { motion } from 'framer-motion';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Timeline from '../../components/common/Timeline';
import ChartCard from '../../components/common/ChartCard';
import { mitigationActions } from '../../data/mockData';
import { timeAgo } from '../../utils/helpers';
import { Wrench, Zap, Route, Power, Bell, Siren, Bot } from 'lucide-react';

const actionIcons = {
  'Emergency Speed Restriction': Siren,
  'Power Rerouting': Power,
  'Maintenance Alert': Bell,
  'Notify Operator': Bell,
  'Route Isolation': Route,
  'Emergency Brake': Zap,
};

const columns = [
  { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'type', label: 'Action Type', render: (v) => {
    const Icon = actionIcons[v] || Wrench;
    return <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'var(--font-medium)' }}><Icon size={14} /> {v}</span>;
  }},
  { key: 'targetName', label: 'Target Asset' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} dot /> },
  { key: 'triggeredBy', label: 'Triggered By', render: (v) => (
    <span className={`badge ${v === 'autonomous' ? 'badge-accent' : 'badge-neutral'}`}>
      {v === 'autonomous' && <Bot size={10} style={{ marginRight: '3px' }} />}
      {v}
    </span>
  )},
  { key: 'executedAt', label: 'Executed', render: (v) => v ? <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span> },
  { key: 'outcome', label: 'Outcome', render: (v) => v || <span style={{ color: 'var(--text-tertiary)' }}>Pending</span> },
];

export default function MitigationCenter() {
  const executed = mitigationActions.filter(a => a.status === 'executed');
  const pending = mitigationActions.filter(a => a.status !== 'executed');

  const timelineItems = executed.map(a => ({
    id: a.id,
    title: a.type,
    description: `${a.targetName} — ${a.outcome}`,
    time: timeAgo(a.executedAt),
    dotColor: 'success',
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Wrench size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Mitigation Center</h1>
          <p>Autonomous and manual mitigation actions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Actions', value: mitigationActions.length, color: 'blue', icon: 'Wrench' },
          { label: 'Executed', value: executed.length, color: 'green', icon: 'CheckCircle' },
          { label: 'Pending', value: pending.length, color: 'amber', icon: 'Clock' },
          { label: 'Autonomous', value: mitigationActions.filter(a => a.triggeredBy === 'autonomous').length, color: 'teal', icon: 'Bot' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className={`kpi-card kpi-${s.color}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            whileHover={{ y: -3 }}
          >
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="col-8">
          <ChartCard title="Mitigation Actions" subtitle="All actions and their statuses">
            <DataTable data={mitigationActions} columns={columns} exportFilename="mitigation_actions" showExport={false} />
          </ChartCard>
        </div>

        <div className="col-4">
          <ChartCard title="Execution Timeline" subtitle="Successfully executed actions">
            <Timeline items={timelineItems} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
