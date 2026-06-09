import { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import { auditLogs } from '../../data/mockData';
import { formatDateTime, timeAgo } from '../../utils/helpers';
import { FileText } from 'lucide-react';

const columns = [
  { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'action', label: 'Action', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
  { key: 'user', label: 'User' },
  { key: 'module', label: 'Module', render: (v) => <span className="badge badge-neutral">{v}</span> },
  { key: 'result', label: 'Result', render: (v) => <StatusBadge status={v === 'Violation' ? 'warning' : v.toLowerCase()} /> },
  { key: 'timestamp', label: 'Timestamp', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{formatDateTime(v)}</span> },
  { key: 'details', label: 'Details', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: '200px', display: 'block' }} className="text-truncate">{v}</span> },
];

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const modules = [...new Set(auditLogs.map(l => l.module))];

  const filtered = auditLogs.filter(log => {
    if (moduleFilter !== 'all' && log.module !== moduleFilter) return false;
    if (search && !log.action.toLowerCase().includes(search.toLowerCase()) && !log.user.toLowerCase().includes(search.toLowerCase()) && !log.details.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FileText size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Audit Logs</h1>
          <p>Complete system activity trail</p>
        </div>
      </div>

      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." />
        <select className="select" style={{ width: 'auto' }} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          <option value="all">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <DataTable data={filtered} columns={columns} pageSize={12} exportFilename="audit_logs" />
    </div>
  );
}
