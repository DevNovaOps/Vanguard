import { useState } from 'react';
import DataTable from '../../components/common/DataTable';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Tabs from '../../components/common/Tabs';
import { transitNodes } from '../../data/mockData';
import { getNodeTypeLabel, formatDate } from '../../utils/helpers';
import { Database, MapPin } from 'lucide-react';

const ASSET_TABS = [
  { id: 'all', label: 'All Assets', count: transitNodes.length },
  { id: 'station', label: 'Stations', count: transitNodes.filter(n => n.type === 'station').length },
  { id: 'junction', label: 'Junctions', count: transitNodes.filter(n => n.type === 'junction').length },
  { id: 'depot', label: 'Depots', count: transitNodes.filter(n => n.type === 'depot').length },
  { id: 'power_hub', label: 'Power Hubs', count: transitNodes.filter(n => n.type === 'power_hub').length },
  { id: 'signal', label: 'Signals', count: transitNodes.filter(n => n.type === 'signal').length },
];

const columns = [
  { key: 'id', label: 'ID', width: '90px', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
  { key: 'name', label: 'Name', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
  { key: 'type', label: 'Type', render: (v) => <span className="badge badge-neutral">{getNodeTypeLabel(v)}</span> },
  { key: 'zone', label: 'Zone' },
  { key: 'sensors', label: 'Sensors', render: (v) => <span style={{ fontWeight: 'var(--font-semibold)' }}>{v}</span> },
  { key: 'riskScore', label: 'Risk Score', render: (v) => (
    <span style={{ fontWeight: 'var(--font-bold)', color: v >= 70 ? 'var(--color-danger)' : v >= 40 ? 'var(--color-warning)' : 'var(--color-success)' }}>{v}</span>
  )},
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} dot /> },
  { key: 'lastMaintenance', label: 'Last Maintenance', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{formatDate(v)}</span> },
];

export default function InfrastructureDatabase() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNode, setSelectedNode] = useState(null);

  const filtered = transitNodes.filter(n => {
    if (activeTab !== 'all' && n.type !== activeTab) return false;
    if (search && !n.name.toLowerCase().includes(search.toLowerCase()) && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Database size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Infrastructure Database</span></h1>
          <p>Railway asset management and maintenance tracking</p>
        </div>
      </div>

      <Tabs tabs={ASSET_TABS} active={activeTab} onChange={setActiveTab} />

      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search assets..." />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        pageSize={10}
        exportFilename="infrastructure_assets"
        onRowClick={(row) => setSelectedNode(row)}
      />

      <Modal isOpen={!!selectedNode} onClose={() => setSelectedNode(null)} title="Asset Details" size="md">
        {selectedNode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={20} color="var(--color-primary-500)" />
              <div>
                <h4>{selectedNode.name}</h4>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{selectedNode.id} · {getNodeTypeLabel(selectedNode.type)} · {selectedNode.zone} Zone</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                ['Status', <StatusBadge key="s" status={selectedNode.status} dot />],
                ['Sensors', selectedNode.sensors],
                ['Risk Score', <span key="r" style={{ fontWeight: 'var(--font-bold)', color: selectedNode.riskScore >= 70 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{selectedNode.riskScore}/100</span>],
                ['Last Maintenance', formatDate(selectedNode.lastMaintenance)],
                ['Latitude', selectedNode.lat?.toFixed(4)],
                ['Longitude', selectedNode.lng?.toFixed(4)],
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
