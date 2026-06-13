import { useState, useEffect } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import { formatDateTime } from '../../utils/helpers';
import { FileText } from 'lucide-react';
import { auditService } from '../../utils/auditService.js';
import { io } from 'socket.io-client';

const columns = [
  { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'action', label: 'Action', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
  { key: 'user', label: 'User' },
  { key: 'module', label: 'Module', render: (v) => <span className="badge badge-neutral">{v}</span> },
  { key: 'result', label: 'Result', render: (v) => <StatusBadge status={v === 'Violation' ? 'warning' : v.toLowerCase()} /> },
  { key: 'timestamp', label: 'Timestamp', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{formatDateTime(v)}</span> },
  { key: 'details', label: 'Details', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: '200px', display: 'block' }} className="text-truncate">{v}</span> },
];

const AVAILABLE_MODULES = [
  'Authentication',
  'Compliance',
  'Risk',
  'Incident',
  'Mitigation',
  'AutonomousAgent',
  'Simulation',
  'Webhook'
];

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (moduleFilter !== 'all') params.module = moduleFilter;
      // Get a large batch so client-side pagination works smoothly on recent ledger records
      params.limit = 1000;

      const res = await auditService.getAuditLogs(params);
      if (res.success && res.data && res.data.logs) {
        const mapped = res.data.logs.map(log => ({
          id: log.auditId,
          action: log.action,
          user: log.username || 'System',
          module: log.module,
          result: log.severity === 'Critical' ? 'Violation' : (log.severity === 'Warning' ? 'Warning' : 'Success'),
          timestamp: log.timestamp || log.createdAt,
          details: log.description
        }));
        setLogs(mapped);
      }
    } catch (err) {
      console.error('[AUDIT-LOGS-FETCH-ERROR] Failed to fetch logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, moduleFilter]);

  useEffect(() => {
    const socket = io();
    socket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time audit logs stream');
    });

    socket.on('audit:create', (newLog) => {
      setLogs(prev => {
        // Prevent duplicate logs from being added
        if (prev.some(l => l.id === newLog.auditId)) return prev;

        const mapped = {
          id: newLog.auditId,
          action: newLog.action,
          user: newLog.user || 'System',
          module: newLog.module,
          result: newLog.result,
          timestamp: newLog.timestamp,
          details: newLog.details
        };

        // Validate filters before appending to local state
        if (moduleFilter !== 'all' && newLog.module !== moduleFilter) return prev;
        if (search && 
            !newLog.action.toLowerCase().includes(search.toLowerCase()) && 
            !newLog.user.toLowerCase().includes(search.toLowerCase()) && 
            !newLog.details.toLowerCase().includes(search.toLowerCase())) {
          return prev;
        }

        return [mapped, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [search, moduleFilter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FileText size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Audit Logs</span></h1>
          <p>Complete system activity trail</p>
        </div>
      </div>

      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." />
        <select className="select" style={{ width: 'auto' }} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          <option value="all">All Modules</option>
          {AVAILABLE_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading audit logs from security ledger...
        </div>
      ) : (
        <DataTable data={logs} columns={columns} pageSize={12} exportFilename="audit_logs" />
      )}
    </div>
  );
}
