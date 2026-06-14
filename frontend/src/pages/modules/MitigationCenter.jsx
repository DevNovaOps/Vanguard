import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Timeline from '../../components/common/Timeline';
import ChartCard from '../../components/common/ChartCard';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SearchInput from '../../components/common/SearchInput';
import { timeAgo } from '../../utils/helpers';
import { Wrench, Zap, Route, Power, Bell, Siren, Bot, AlertTriangle, CheckCircle, Clock, Plus, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mitigationService } from '../../utils/mitigationService';
import { incidentService } from '../../utils/incidentService';
import { networkService } from '../../utils/networkService';
import { io } from 'socket.io-client';
import { useSimulation } from '../../contexts/SimulationContext';

const actionIcons = {
  'Emergency Speed Restriction': Siren,
  'Power Rerouting': Power,
  'Maintenance Dispatch': Bell,
  'Notify Operator': Bell,
  'Route Isolation': Route,
  'Emergency Brake': Zap,
  'Infrastructure Shutdown': Zap,
  'Ventilation Activation': Siren,
  'Safety Escalation': AlertTriangle
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
  { key: 'outcome', label: 'Outcome', width: '260px', render: (v) => {
    if (!v) return <span style={{ color: 'var(--text-tertiary)' }}>Pending</span>;
    const isLong = v.length > 60;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '260px' }}>
        <span style={{ 
          fontSize: 'var(--text-xs)', 
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          flex: 1
        }}>
          {v}
        </span>
        {isLong && (
          <button
            className="btn btn-secondary"
            style={{ 
              padding: '2px 8px', 
              fontSize: '10px', 
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              borderRadius: 'var(--radius-sm)',
              lineHeight: 1
            }}
            onClick={(e) => { /* let row click propagate to open detail modal */ }}
          >
            <Eye size={10} /> View
          </button>
        )}
      </div>
    );
  }},
];

export default function MitigationCenter() {
  const { user } = useAuth();
  const { simulationStore } = useSimulation();
  
  // States
  const [mitigations, setMitigations] = useState([]);
  const [stats, setStats] = useState({
    totalMitigations: 0,
    pendingActions: 0,
    activeActions: 0,
    completedActions: 0,
    failedActions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Modals state
  const [selectedMitigation, setSelectedMitigation] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [nodes, setNodes] = useState([]);
  const [openIncidents, setOpenIncidents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createForm, setCreateForm] = useState({
    incidentId: '',
    nodeId: '',
    action: 'Emergency Brake',
    severity: 'Medium',
    executionNotes: ''
  });

  const [executing, setExecuting] = useState(false);
  const [executionNotes, setExecutionNotes] = useState('');
  const [execError, setExecError] = useState(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Auth permissions
  const isManager = user?.role === 'manager';
  const isOperator = user?.role === 'operator';
  const isSafetyOfficer = user?.role === 'safety_officer';
  const isAdmin = user?.role === 'admin';

  const canExecute = isAdmin || isSafetyOfficer || isOperator;
  const canUpdateStatus = isAdmin || isSafetyOfficer;
  const canCreate = isAdmin || isSafetyOfficer || isOperator;

  // Fetch data from backend
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const [listRes, statsRes] = await Promise.all([
        mitigationService.getMitigations(),
        mitigationService.getDashboardStats()
      ]);

      if (listRes.success && listRes.data) {
        setMitigations(listRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      setError(null);
    } catch (err) {
      console.error('[MITIGATION-CENTER] Fetch failed:', err);
      if (!isSilent) {
        setError(err.message || 'Failed to load mitigations');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch options for creation form
  const fetchFormOptions = useCallback(async () => {
    try {
      const [nodesRes, incidentsRes] = await Promise.all([
        networkService.getNodes(),
        incidentService.getOpenIncidents()
      ]);
      if (nodesRes.success && nodesRes.nodes) {
        setNodes(nodesRes.nodes);
      }
      if (incidentsRes.success && incidentsRes.data) {
        setOpenIncidents(incidentsRes.data);
      }
    } catch (err) {
      console.error('[MITIGATION-CENTER] Failed to fetch form options:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modals fetch options
  useEffect(() => {
    if (isCreateOpen) {
      fetchFormOptions();
    }
  }, [isCreateOpen, fetchFormOptions]);

  // Socket.IO Integration
  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time mitigation stream');
    });

    const handleCreate = (newMit) => {
      setMitigations(prev => {
        const exists = prev.find(m => m.mitigationId === newMit.mitigationId || m._id === newMit._id);
        if (exists) return prev;
        return [newMit, ...prev];
      });
      fetchData(true);
    };

    const handleUpdate = (updatedMit) => {
      setMitigations(prev => prev.map(m => (m.mitigationId === updatedMit.mitigationId || m._id === updatedMit._id) ? updatedMit : m));
      setSelectedMitigation(curr => {
        if (curr && (curr.mitigationId === updatedMit.mitigationId || curr._id === updatedMit._id)) {
          return updatedMit;
        }
        return curr;
      });
      fetchData(true);
    };

    socket.on('mitigation:create', handleCreate);
    socket.on('mitigation:update', handleUpdate);
    socket.on('mitigation:execute', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  // Submit manual creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.incidentId || !createForm.nodeId) {
      setCreateError('Please select both an incident and target node.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await mitigationService.createMitigation(createForm);
      if (res.success) {
        setIsCreateOpen(false);
        setCreateForm({
          incidentId: '',
          nodeId: '',
          action: 'Emergency Brake',
          severity: 'Medium',
          executionNotes: ''
        });
        fetchData(true);
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create mitigation.');
    } finally {
      setCreating(false);
    }
  };

  // Auto-populate node when incident is selected
  const handleIncidentChange = (incidentId) => {
    const selectedInc = openIncidents.find(i => i._id === incidentId);
    let resolvedNodeId = '';
    if (selectedInc && selectedInc.nodeId) {
      resolvedNodeId = typeof selectedInc.nodeId === 'object' ? selectedInc.nodeId._id : selectedInc.nodeId;
    }
    setCreateForm(prev => ({
      ...prev,
      incidentId,
      nodeId: resolvedNodeId || '',
      severity: selectedInc ? selectedInc.severity : 'Medium'
    }));
  };

  // Submit manual execution
  const handleExecute = async () => {
    if (!selectedMitigation) return;
    setExecuting(true);
    setExecError(null);
    try {
      const res = await mitigationService.executeMitigation(selectedMitigation._id, executionNotes);
      if (res.success && res.data) {
        setExecutionNotes('');
        setSelectedMitigation(res.data);
        // Sync local list state immediately
        setMitigations(prev => prev.map(m => (m._id === res.data._id || m.mitigationId === res.data.mitigationId) ? res.data : m));
        // Silent refresh to update dashboard counters
        fetchData(true);
      }
    } catch (err) {
      setExecError(err.message || 'Execution request failed');
    } finally {
      setExecuting(false);
    }
  };

  // Submit status update
  const handleStatusChange = async (newStatus) => {
    if (!selectedMitigation) return;
    setUpdatingStatus(true);
    setExecError(null);
    try {
      const res = await mitigationService.updateMitigationStatus(
        selectedMitigation._id,
        newStatus,
        executionNotes || selectedMitigation.executionNotes
      );
      if (res.success && res.data) {
        setExecutionNotes('');
        setSelectedMitigation(res.data);
        // Sync local list state immediately
        setMitigations(prev => prev.map(m => (m._id === res.data._id || m.mitigationId === res.data.mitigationId) ? res.data : m));
        // Silent refresh to update dashboard counters
        fetchData(true);
      }
    } catch (err) {
      setExecError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Derived properties
  const filteredMitigations = useMemo(() => {
    let list = mitigations;
    if (simulationStore) {
      const simMit = {
        _id: 'simulated-mitigation-011',
        mitigationId: 'MIT-SIM-011',
        type: 'Emergency Speed Restriction',
        action: 'Emergency Speed Restriction (30 km/h) & Coolant Flush',
        targetName: 'Bhusawal Power Hub (S-011)',
        severity: 'Critical',
        status: 'Executed',
        triggeredBy: 'autonomous',
        createdAt: new Date().toISOString(),
        executedAt: new Date().toISOString(),
        executionSource: 'AI Multi-Agent Core',
        executionNotes: simulationStore.mitigation_actions || 'Proactive coolant flush and manual checking scheduled within 24 hours.'
      };
      list = [simMit, ...list];
    }
    return list.filter(m => {
      const matchesSearch = search === '' ||
        m.mitigationId?.toLowerCase().includes(search.toLowerCase()) ||
        m.type?.toLowerCase().includes(search.toLowerCase()) ||
        m.targetName?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || m.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesSeverity = severityFilter === 'all' || m.severity?.toLowerCase() === severityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [mitigations, search, statusFilter, severityFilter, simulationStore]);

  const executed = useMemo(() => {
    let list = mitigations.filter(a => a.status === 'Executed' || a.status === 'Completed');
    if (simulationStore) {
      list = [
        {
          _id: 'simulated-mitigation-011',
          mitigationId: 'MIT-SIM-011',
          type: 'Emergency Speed Restriction',
          action: 'Emergency Speed Restriction (30 km/h) & Coolant Flush',
          targetName: 'Bhusawal Power Hub (S-011)',
          status: 'Executed',
          executedAt: new Date().toISOString()
        },
        ...list
      ];
    }
    return list;
  }, [mitigations, simulationStore]);

  const pending = useMemo(() => {
    return mitigations.filter(a => a.status !== 'Executed' && a.status !== 'Completed');
  }, [mitigations]);

  const timelineItems = useMemo(() => {
    return executed.slice(0, 10).map(a => ({
      id: a._id || a.mitigationId,
      title: a.type || a.action,
      description: `${a.targetName} — ${a.outcome || 'Success'}`,
      time: a._id === 'simulated-mitigation-011' ? 'just now' : timeAgo(a.executedAt || a.updatedAt),
      dotColor: a.status === 'Completed' ? 'success' : 'info',
    }));
  }, [executed]);

  // Render loading state
  if (loading && mitigations.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Render error state
  if (error && mitigations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 1rem' }} />
        <h3>Failed to Connect to Mitigation Center</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchData(false)}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><Wrench size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Mitigation Center</span></h1>
          <p>Autonomous and manual mitigation actions</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={14} /> Trigger Manual Action
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Actions', value: stats.totalMitigations, color: 'blue', icon: 'Wrench' },
          { label: 'Executed / Completed', value: stats.completedActions, color: 'green', icon: 'CheckCircle' },
          { label: 'Pending', value: stats.pendingActions, color: 'amber', icon: 'Clock' },
          { label: 'Active', value: stats.activeActions, color: 'teal', icon: 'Bot' },
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

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search mitigations..." />
        <select
          className="select"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="inprogress">In Progress</option>
          <option value="executed">Executed</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="dashboard-grid">
        <div className="col-8">
          <ChartCard title="Mitigation Actions Registry" subtitle="All operations logs and states">
            {filteredMitigations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                No mitigations found matching filters.
              </div>
            ) : (
              <DataTable
                data={filteredMitigations}
                columns={columns}
                exportFilename="mitigation_actions"
                showExport={false}
                onRowClick={(row) => {
                  setExecError(null);
                  setExecutionNotes('');
                  setSelectedMitigation(row);
                }}
              />
            )}
          </ChartCard>
        </div>

        <div className="col-4">
          <ChartCard title="Execution Timeline" subtitle="Successfully completed interventions">
            {timelineItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                No executed mitigations.
              </div>
            ) : (
              <Timeline items={timelineItems} />
            )}
          </ChartCard>
        </div>
      </div>

      {/* Manual Action Trigger Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Trigger Manual Mitigation Action" size="md">
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Select Active Incident</label>
            <select
              className="select"
              value={createForm.incidentId}
              onChange={e => handleIncidentChange(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            >
              <option value="">-- Select an Incident --</option>
              {openIncidents.map(inc => (
                <option key={inc._id} value={inc._id}>{inc.incidentId} - {inc.title} ({inc.severity})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Target Asset</label>
            <select
              className="select"
              value={createForm.nodeId}
              onChange={e => setCreateForm({ ...createForm, nodeId: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            >
              <option value="">-- Select Target Node --</option>
              {nodes.map(n => (
                <option key={n._id} value={n._id}>{n.nodeName} ({n.nodeCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Mitigation Action Type</label>
            <select
              className="select"
              value={createForm.action}
              onChange={e => setCreateForm({ ...createForm, action: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            >
              <option value="Emergency Brake">Emergency Brake</option>
              <option value="Emergency Speed Restriction">Emergency Speed Restriction</option>
              <option value="Power Rerouting">Power Rerouting</option>
              <option value="Route Isolation">Route Isolation</option>
              <option value="Infrastructure Shutdown">Infrastructure Shutdown</option>
              <option value="Maintenance Dispatch">Maintenance Dispatch</option>
              <option value="Ventilation Activation">Ventilation Activation</option>
              <option value="Safety Escalation">Safety Escalation</option>
            </select>
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Mitigation Target Severity</label>
            <select
              className="select"
              value={createForm.severity}
              onChange={e => setCreateForm({ ...createForm, severity: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Execution Strategy Notes</label>
            <textarea
              className="textarea"
              rows="3"
              value={createForm.executionNotes}
              onChange={e => setCreateForm({ ...createForm, executionNotes: e.target.value })}
              placeholder="Detail safety parameters or dispatch notes..."
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            />
          </div>

          {createError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{createError}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)} disabled={creating}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Triggering...' : 'Dispatch Action'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mitigation Action Detail & Execution Modal */}
      <Modal isOpen={!!selectedMitigation} onClose={() => setSelectedMitigation(null)} title="Mitigation Control Center" size="lg">
        {selectedMitigation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(() => {
                    const Icon = actionIcons[selectedMitigation.type] || Wrench;
                    return <Icon size={18} style={{ color: 'var(--color-primary-400)' }} />;
                  })()}
                  {selectedMitigation.action}
                </h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                  {selectedMitigation.mitigationId}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className={`badge ${selectedMitigation.triggeredBy === 'autonomous' ? 'badge-accent' : 'badge-neutral'}`}>
                  {selectedMitigation.triggeredBy}
                </span>
                <StatusBadge status={selectedMitigation.status} dot />
              </div>
            </div>

            {/* Information Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                ['Target Node', selectedMitigation.targetName],
                ['Severity Code', selectedMitigation.severity],
                ['Linked Incident', selectedMitigation.incidentId?.incidentId || 'Unknown Incident'],
                ['Execution Source', selectedMitigation.executionSource],
                ['Assigned Handler', selectedMitigation.executedBy ? selectedMitigation.executedBy.name : 'Unassigned'],
                ['Created At', new Date(selectedMitigation.createdAt).toLocaleString()]
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Execution Audit Trail & Logs */}
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--font-bold)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Execution details & logs
              </div>
              <div style={{ fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {selectedMitigation.executionNotes || 'No execution logs recorded yet.'}
              </div>
              {selectedMitigation.executedAt && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Executed at {new Date(selectedMitigation.executedAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* Execution Controls Form */}
            {canExecute && ['Pending', 'InProgress'].includes(selectedMitigation.status) && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase' }}>
                  Operational Actions
                </div>
                <div>
                  <textarea
                    className="textarea"
                    rows="2"
                    value={executionNotes}
                    onChange={(e) => setExecutionNotes(e.target.value)}
                    placeholder="Enter operation response logs / details for this action..."
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                  />
                </div>

                {execError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{execError}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Status updates for Safety Officer / Admin */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {canUpdateStatus && (
                      <>
                        {selectedMitigation.status === 'Pending' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={updatingStatus}
                            onClick={() => handleStatusChange('InProgress')}
                          >
                            Mark In Progress
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('Cancelled')}
                        >
                          Cancel Action
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('Failed')}
                        >
                          Mark Failed
                        </button>
                      </>
                    )}
                  </div>

                  {/* Standard Execution Button */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={executing}
                    onClick={handleExecute}
                  >
                    <Zap size={14} style={{ marginRight: '4px' }} />
                    {executing ? 'Executing...' : 'Execute Mitigation'}
                  </button>
                </div>
              </div>
            )}

            {/* Status change controls for safety/admin if mitigation was already executed but not yet completed */}
            {canUpdateStatus && selectedMitigation.status === 'Executed' && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase' }}>
                  Complete / Close Intervention
                </div>
                <div>
                  <textarea
                    className="textarea"
                    rows="2"
                    value={executionNotes}
                    onChange={(e) => setExecutionNotes(e.target.value)}
                    placeholder="Enter final closure details..."
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
                  />
                </div>
                {execError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>{execError}</div>}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-danger)' }}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange('Failed')}
                  >
                    Mark Failed
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange('Completed')}
                  >
                    Mark Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
