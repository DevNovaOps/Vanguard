import { useState, useMemo, useEffect, useCallback } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import Modal from '../../components/common/Modal';
import ChartCard from '../../components/common/ChartCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { incidentService } from '../../utils/incidentService';
import { timeAgo, MaxHeap } from '../../utils/helpers';
import { AlertCircle, ArrowUpDown } from 'lucide-react';
import { io } from 'socket.io-client';

const columns = [
  { key: 'id', label: 'Incident ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'severity', label: 'Severity', render: (v) => <StatusBadge status={v} dot /> },
  { key: 'title', label: 'Title', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
  { key: 'assetName', label: 'Asset' },
  { key: 'riskScore', label: 'Risk Score', render: (v) => (
    <span style={{ fontWeight: 'var(--font-bold)', color: v >= 80 ? 'var(--color-danger)' : v >= 50 ? 'var(--color-warning)' : 'var(--text-primary)' }}>{v}</span>
  )},
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'assignedTeam', label: 'Team', render: (v) => <span className="badge badge-primary">{v ? `Team ${v}` : 'Unassigned'}</span> },
  { key: 'createdAt', label: 'Created', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> },
];

export default function IncidentManagement() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch incidents from backend in priority order (using Max Heap)
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await incidentService.getPrioritizedQueue();
      if (res.success && res.queue) {
        setIncidents(res.queue);
      }
    } catch (err) {
      console.error('[INCIDENT-PAGE] Fetch failed:', err);
      setError(err.message || 'Failed to load prioritized incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Hook up Socket.IO listeners
  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time incident stream');
    });

    const handlePriorityUpdate = (data) => {
      console.log('[SOCKET] Received priority queue update');
      if (data && data.queue) {
        setIncidents(data.queue);
      } else {
        fetchIncidents();
      }
    };

    const handleCreate = () => {
      fetchIncidents();
    };

    const handleUpdate = (updatedInc) => {
      setSelectedIncident((curr) => {
        if (curr && (curr.incidentId === updatedInc.incidentId || curr._id === updatedInc._id)) {
          return updatedInc;
        }
        return curr;
      });
      fetchIncidents();
    };

    socket.on('incident:priority:update', handlePriorityUpdate);
    socket.on('incident:create', handleCreate);
    socket.on('incident:update', handleUpdate);
    socket.on('incident:resolve', handleUpdate);
    socket.on('incident:close', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchIncidents]);

  // Read prioritization directly from backend heap sorting
  const heapPrioritized = useMemo(() => {
    return incidents.map(inc => ({
      ...inc,
      id: inc.incidentId,
      asset: typeof inc.nodeId === 'object' ? inc.nodeId?.nodeCode : '',
      assetName: typeof inc.nodeId === 'object' ? inc.nodeId?.nodeName : 'Unknown Asset'
    }));
  }, [incidents]);

  const filtered = heapPrioritized.filter(inc => {
    if (severityFilter !== 'all' && inc.severity?.toLowerCase() !== severityFilter.toLowerCase()) return false;
    if (search && !inc.title?.toLowerCase().includes(search.toLowerCase()) && !inc.id?.toLowerCase().includes(search.toLowerCase())) return false;
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
          {heapPrioritized.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-tertiary)', textAlign: 'center', width: '100%' }}>No active incidents in queue</div>
          ) : (
            heapPrioritized.map((inc, i) => (
              <div key={inc.id || inc._id} className="animate-slide-up" style={{
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
            ))
          )}
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

      {loading && incidents.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : error && incidents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchIncidents} style={{ marginTop: '1rem' }}>Retry</button>
        </div>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          exportFilename="incidents"
          onRowClick={(row) => setSelectedIncident(row)}
        />
      )}

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
                ['Assigned Team', selectedIncident.assignedTeam ? `Team ${selectedIncident.assignedTeam}` : 'Unassigned'],
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
