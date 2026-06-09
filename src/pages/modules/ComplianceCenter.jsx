import { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import Timeline from '../../components/common/Timeline';
import ChartCard from '../../components/common/ChartCard';
import { complianceRules, violations } from '../../data/mockData';
import { timeAgo } from '../../utils/helpers';
import { Shield } from 'lucide-react';

const TABS = [
  { id: 'rules', label: 'Compliance Rules', count: complianceRules.length },
  { id: 'violations', label: 'Violations', count: violations.length },
  { id: 'timeline', label: 'Timeline' },
];

const ruleColumns = [
  { key: 'code', label: 'Code', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary-500)' }}>{v}</span> },
  { key: 'name', label: 'Rule Name', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
  { key: 'authority', label: 'Authority' },
  { key: 'category', label: 'Category', render: (v) => <span className="badge badge-neutral">{v}</span> },
  { key: 'threshold', label: 'Threshold', render: (v) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
  { key: 'violations', label: 'Violations', render: (v) => (
    <span style={{ fontWeight: 'var(--font-bold)', color: v > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{v}</span>
  )},
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const violationColumns = [
  { key: 'id', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'ruleName', label: 'Rule' },
  { key: 'assetName', label: 'Asset' },
  { key: 'value', label: 'Value', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', fontWeight: 'var(--font-semibold)' }}>{v}</span> },
  { key: 'threshold', label: 'Threshold', render: (v) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
  { key: 'severity', label: 'Severity', render: (v) => <StatusBadge status={v} dot /> },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'detectedAt', label: 'Detected', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> },
];

export default function ComplianceCenter() {
  const [activeTab, setActiveTab] = useState('rules');
  const [search, setSearch] = useState('');

  const violationTimeline = violations.map(v => ({
    id: v.id,
    title: `${v.ruleName} — ${v.assetName}`,
    description: `Value: ${v.value} (Threshold: ${v.threshold})`,
    time: timeAgo(v.detectedAt),
    dotColor: v.severity === 'critical' ? 'danger' : v.severity === 'high' ? 'warning' : '',
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Shield size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Compliance Center</h1>
          <p>Rule enforcement and violation tracking</p>
        </div>
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab !== 'timeline' && (
        <div className="filter-bar">
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${activeTab}...`} />
        </div>
      )}

      {activeTab === 'rules' && (
        <DataTable data={complianceRules} columns={ruleColumns} exportFilename="compliance_rules" />
      )}

      {activeTab === 'violations' && (
        <DataTable data={violations} columns={violationColumns} exportFilename="violations" />
      )}

      {activeTab === 'timeline' && (
        <ChartCard title="Violation Timeline" subtitle="Chronological view of compliance breaches">
          <Timeline items={violationTimeline} />
        </ChartCard>
      )}
    </div>
  );
}
