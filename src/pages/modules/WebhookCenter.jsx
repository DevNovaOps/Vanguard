import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import { webhooks, webhookEventLogs } from '../../data/mockData';
import { timeAgo } from '../../utils/helpers';
import { Webhook } from 'lucide-react';

const eventColumns = [
  { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'webhookId', label: 'Webhook', render: (v) => {
    const wh = webhooks.find(w => w.id === v);
    return wh?.name || v;
  }},
  { key: 'event', label: 'Event', render: (v) => <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'responseCode', label: 'Response', render: (v) => (
    <span style={{ fontFamily: 'var(--font-mono)', color: v >= 200 && v < 300 ? 'var(--color-success)' : 'var(--color-danger)' }}>{v}</span>
  )},
  { key: 'latency', label: 'Latency', render: (v) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}ms</span> },
  { key: 'timestamp', label: 'Time', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> },
];

const latencyData = webhooks.map(wh => ({
  name: wh.name.split(' ').slice(0, 2).join(' '),
  latency: wh.avgLatency,
  success: wh.successRate,
}));

export default function WebhookCenter() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Webhook size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Webhook Center</h1>
          <p>Event delivery monitoring and integration health</p>
        </div>
      </div>

      {/* Webhook Cards */}
      <div className="grid-responsive" style={{ marginBottom: '1.5rem' }}>
        {webhooks.map((wh, i) => (
          <div key={wh.id} className="card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: 'var(--text-sm)' }}>{wh.name}</h4>
              <StatusBadge status={wh.status} dot />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              {wh.url.substring(0, 40)}...
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {wh.events.map(e => (
                <span key={e} className="badge badge-neutral" style={{ fontSize: '9px' }}>{e}</span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <span>Success: <strong style={{ color: wh.successRate >= 99 ? 'var(--color-success)' : 'var(--color-warning)' }}>{wh.successRate}%</strong></span>
              <span>Latency: <strong>{wh.avgLatency}ms</strong></span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="col-6">
          <ChartCard title="Latency by Webhook" subtitle="Average response time (ms)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="latency" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-6">
          <ChartCard title="Success Rate" subtitle="Delivery success percentage">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis domain={[85, 101]} tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="success" fill="var(--color-accent-500)" radius={[4, 4, 0, 0]} name="Success %" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-12">
          <ChartCard title="Event Logs" subtitle="Recent webhook deliveries">
            <DataTable data={webhookEventLogs} columns={eventColumns} exportFilename="webhook_events" showExport={false} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
