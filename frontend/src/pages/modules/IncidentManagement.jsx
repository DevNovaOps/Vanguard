import { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';
import Timeline from '../../components/common/Timeline';
import ChartCard from '../../components/common/ChartCard';
import { incidents } from '../../data/mockData';
import { timeAgo, MaxHeap } from '../../utils/helpers';
import { AlertCircle, ArrowUpDown } from 'lucide-react';

const columns = [
  { key: 'id', label: 'Incident ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'severity', label: 'Severity', render: (v) => <StatusBadge status={v} dot /> },
  { key: 'title', label: 'Title', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
  { key: 'assetName', label: 'Asset' },
  { key: 'riskScore', label: 'Risk Score', render: (v) => (
    <span style={{ fontWeight: 'var(--font-bold)', color: v >= 80 ? 'var(--color-danger)' : v >= 50 ? 'var(--color-warning)' : 'var(--text-primary)' }}>{v}</span>
  )},
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'assignedTeam', label: 'Team', render: (v) => <span className="badge badge-primary">Team {v}</span> },
  { key: 'createdAt', label: 'Created', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> },
];

export default function IncidentManagement() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Max Heap prioritization
  const heapPrioritized = useMemo(() => {
    const heap = new MaxHeap();
    incidents.forEach(inc => heap.insert(inc));
    return heap.toArray();
  }, []);

  const filtered = heapPrioritized.filter(inc => {
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><AlertCircle size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Incident Management</h1>
          <p>Prioritized incident tracking with Max Heap ordering</p>
        </div>
        <div className="page-actions">
          <div className="badge badge-accent" style={{ padding: '6px 12px' }}>
            <ArrowUpDown size={12} /> Max Heap Prioritized
          </div>
        </div>
      </div>

      {/* Heap Visualization */}
      <ChartCard title="Max Heap Priority Queue" subtitle="Incidents ordered by risk score (highest priority first)" className="animate-slide-up" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem 0' }}>
          {heapPrioritized.map((inc, i) => (
            <div key={inc.id} className="animate-slide-up" style={{
              minWidth: '140px', padding: '0.75rem', background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-lg)', textAlign: 'center', flexShrink: 0,
              borderTop: `3px solid ${inc.riskScore >= 80 ? 'var(--color-danger)' : inc.riskScore >= 50 ? 'var(--color-warning)' : 'var(--color-success)'}`,
              animationDelay: `${i * 50}ms`
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Priority #{i + 1}</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: inc.riskScore >= 80 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{inc.riskScore}</div>
              <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{inc.id}</div>
              <StatusBadge status={inc.severity} />
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search incidents..." />
        <select className="select" style={{ width: 'auto' }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        exportFilename="incidents"
        onRowClick={(row) => setSelectedIncident(row)}
      />

      <Modal isOpen={!!selectedIncident} onClose={() => setSelectedIncident(null)} title="Incident Details" size="lg">
        {selectedIncident && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ marginBottom: '4px' }}>{selectedIncident.title}</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{selectedIncident.id}</span>
              </div>
              <StatusBadge status={selectedIncident.severity} dot />
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{selectedIncident.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                ['Asset', selectedIncident.assetName],
                ['Risk Score', selectedIncident.riskScore + '/100'],
                ['Assigned Team', `Team ${selectedIncident.assignedTeam}`],
                ['Status', <StatusBadge key="s" status={selectedIncident.status} />],
                ['Created', timeAgo(selectedIncident.createdAt)],
                ['Priority', `#${heapPrioritized.indexOf(selectedIncident) + 1}`],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
