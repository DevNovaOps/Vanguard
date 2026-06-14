import { useState, useMemo } from 'react';
import DataTable from '../../components/common/DataTable';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Tabs from '../../components/common/Tabs';
import rawNodes from '../../data/vanguard_railway_nodes_1200.json';
import { getNodeTypeLabel, formatDate } from '../../utils/helpers';
import { Database, MapPin } from 'lucide-react';

const columns = [
  { key: 'id', label: 'ID', width: '100px', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
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

  // Map 1200+ raw nodes dynamically to UI fields
  const mappedNodes = useMemo(() => {
    return rawNodes.map((node) => {
      // Map nodeType to UI types: signal, power_hub, depot, junction, station
      let mappedType = 'station';
      const rawType = node.nodeType;
      if (rawType === 'SignalTower') mappedType = 'signal';
      else if (rawType === 'PowerHub') mappedType = 'power_hub';
      else if (rawType === 'Depot') mappedType = 'depot';
      else if (rawType === 'Junction') mappedType = 'junction';
      else if (rawType === 'Station') mappedType = 'station';

      // Derived stable count for sensors based on type
      let sensorsCount = 6;
      if (mappedType === 'station') sensorsCount = 24;
      else if (mappedType === 'junction') sensorsCount = 12;
      else if (mappedType === 'depot') sensorsCount = 8;
      else if (mappedType === 'power_hub') sensorsCount = 14;

      // Stable mock riskScore and lastMaintenance based on nodeCode index number
      const codeNum = parseInt(node.nodeCode?.replace(/\D/g, '') || '0') || 1;
      const status = node.status?.toLowerCase() || 'healthy';

      let riskScore = 12;
      if (status === 'critical') riskScore = 80 + (codeNum % 15);
      else if (status === 'warning' || status === 'degraded') riskScore = 40 + (codeNum % 25);
      else if (status === 'maintenance') riskScore = 5 + (codeNum % 5);
      else riskScore = 5 + (codeNum % 25);

      const maintenanceMonthsAgo = (codeNum % 6) + 1;
      const lastMaintenanceDate = `2026-0${7 - maintenanceMonthsAgo}-12`;

      return {
        id: node.nodeCode,
        name: node.nodeName,
        type: mappedType,
        zone: node.region,
        sensors: sensorsCount,
        riskScore: riskScore,
        status: status === 'degraded' ? 'warning' : status,
        lastMaintenance: lastMaintenanceDate,
        lat: node.latitude,
        lng: node.longitude
      };
    });
  }, []);

  // Compute tabs dynamically based on the 1200+ nodes data
  const assetTabs = useMemo(() => {
    return [
      { id: 'all', label: 'All Assets', count: mappedNodes.length },
      { id: 'station', label: 'Stations', count: mappedNodes.filter(n => n.type === 'station').length },
      { id: 'junction', label: 'Junctions', count: mappedNodes.filter(n => n.type === 'junction').length },
      { id: 'depot', label: 'Depots', count: mappedNodes.filter(n => n.type === 'depot').length },
      { id: 'power_hub', label: 'Power Hubs', count: mappedNodes.filter(n => n.type === 'power_hub').length },
      { id: 'signal', label: 'Signals', count: mappedNodes.filter(n => n.type === 'signal').length },
    ];
  }, [mappedNodes]);

  const filtered = useMemo(() => {
    return mappedNodes.filter(n => {
      if (activeTab !== 'all' && n.type !== activeTab) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          n.name.toLowerCase().includes(query) ||
          n.id.toLowerCase().includes(query) ||
          n.zone.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [mappedNodes, activeTab, search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            <Database size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            <span className="gradient-text">Infrastructure Database</span>
          </h1>
          <p>Railway asset management and maintenance tracking — {mappedNodes.length} Total Assets</p>
        </div>
      </div>

      <Tabs tabs={assetTabs} active={activeTab} onChange={setActiveTab} />

      <div className="filter-bar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search assets by name, code, or zone..." />
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
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                  {selectedNode.id} · {getNodeTypeLabel(selectedNode.type)} · {selectedNode.zone} Region
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                ['Status', <StatusBadge key="s" status={selectedNode.status} dot />],
                ['Sensors', selectedNode.sensors],
                ['Risk Score', <span key="r" style={{ fontWeight: 'var(--font-bold)', color: selectedNode.riskScore >= 70 ? 'var(--color-danger)' : 'var(--text-primary)' }}>{selectedNode.riskScore}/100</span>],
                ['Last Maintenance', formatDate(selectedNode.lastMaintenance)],
                ['Latitude', selectedNode.lat?.toFixed(6)],
                ['Longitude', selectedNode.lng?.toFixed(6)],
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
