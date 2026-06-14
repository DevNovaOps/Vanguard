import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import Timeline from '../../components/common/Timeline';
import ChartCard from '../../components/common/ChartCard';
import KPICard from '../../components/common/KPICard';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { complianceService } from '../../utils/complianceService';
import { timeAgo } from '../../utils/helpers';
import { Shield, Plus, Edit2, Trash2, AlertTriangle, CheckSquare } from 'lucide-react';

const SENSOR_TYPES = [
  'Temperature',
  'Vibration',
  'Pressure',
  'Gas',
  'Humidity',
  'Smoke',
  'Voltage',
  'Current'
];

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function ComplianceCenter() {
  const { user } = useAuth();
  const userRoleNorm = (user?.role || '').toLowerCase().replace(/_/g, '');
  const isAdmin = userRoleNorm === 'admin';
  const isOperator = userRoleNorm === 'operator';
  const isManager = userRoleNorm === 'manager';
  
  // Tab control based on roles
  const getTabsForRole = useCallback((role) => {
    if (role === 'operator') {
      return [
        { id: 'violations', label: 'Violations' },
        { id: 'timeline', label: 'Timeline' }
      ];
    }
    if (role === 'manager') {
      return [
        { id: 'stats', label: 'Compliance Stats' },
        { id: 'timeline', label: 'Timeline' }
      ];
    }
    return [
      { id: 'rules', label: 'Compliance Rules' },
      { id: 'violations', label: 'Violations' },
      { id: 'timeline', label: 'Timeline' }
    ];
  }, []);

  const getDefaultTabForRole = useCallback((role) => {
    if (role === 'operator') return 'violations';
    if (role === 'manager') return 'stats';
    return 'rules';
  }, []);

  const tabs = getTabsForRole(userRoleNorm);
  const [activeTab, setActiveTab] = useState(getDefaultTabForRole(userRoleNorm));
  const [search, setSearch] = useState('');
  
  // Data states
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedRule, setSelectedRule] = useState(null);
  const [formData, setFormData] = useState({
    ruleCode: '',
    standard: '',
    sensorType: 'Temperature',
    minValue: '',
    maxValue: '',
    severity: 'Medium',
    description: ''
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all compliance data from backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch dashboard stats (only if not operator)
      if (user?.role !== 'operator') {
        const statsRes = await complianceService.getDashboardStats();
        if (statsRes.success) {
          setStats(statsRes.stats);
        }
      }

      // 2. Fetch rules (only if authorized)
      if (user?.role !== 'operator' && user?.role !== 'manager') {
        const rulesRes = await complianceService.getRules({ limit: 100 });
        if (rulesRes.success) {
          setRules(rulesRes.rules);
        }
      }

      // 3. Fetch violations (only if authorized)
      if (user?.role !== 'manager') {
        const violationsRes = await complianceService.getViolations({ limit: 100 });
        if (violationsRes.success) {
          setViolations(violationsRes.violations);
        }
      }
    } catch (err) {
      console.error('[COMPLIANCE-CENTER] Fetch failed:', err);
      setError(err.message || 'Failed to load compliance data from backend');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle create/update submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        minValue: formData.minValue === '' ? null : Number(formData.minValue),
        maxValue: formData.maxValue === '' ? null : Number(formData.maxValue),
      };

      let res;
      if (modalMode === 'create') {
        res = await complianceService.createRule(payload);
      } else {
        res = await complianceService.updateRule(selectedRule._id, payload);
      }

      if (res.success) {
        setIsModalOpen(false);
        resetForm();
        await fetchData(); // Refresh data immediately
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save compliance rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setModalMode('create');
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (rule) => {
    setModalMode('edit');
    setSelectedRule(rule);
    setFormData({
      ruleCode: rule.ruleCode,
      standard: rule.standard,
      sensorType: rule.sensorType,
      minValue: rule.minValue !== null ? String(rule.minValue) : '',
      maxValue: rule.maxValue !== null ? String(rule.maxValue) : '',
      severity: rule.severity,
      description: rule.description || ''
    });
    setIsModalOpen(true);
  };

  // Handle soft delete
  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this compliance rule?')) {
      try {
        const res = await complianceService.deleteRule(ruleId);
        if (res.success) {
          await fetchData();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete compliance rule');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      ruleCode: '',
      standard: '',
      sensorType: 'Temperature',
      minValue: '',
      maxValue: '',
      severity: 'Medium',
      description: ''
    });
    setFormError(null);
    setSelectedRule(null);
  };

  // Filter rules based on search
  const filteredRules = rules.filter(rule => 
    rule.ruleCode.toLowerCase().includes(search.toLowerCase()) ||
    rule.standard.toLowerCase().includes(search.toLowerCase()) ||
    (rule.description && rule.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Filter violations based on search
  const filteredViolations = violations.filter(v => 
    (v.ruleId?.ruleCode && v.ruleId.ruleCode.toLowerCase().includes(search.toLowerCase())) ||
    (v.nodeId?.nodeName && v.nodeId.nodeName.toLowerCase().includes(search.toLowerCase())) ||
    v.sensorType.toLowerCase().includes(search.toLowerCase())
  );

  // Table Column Definitions
  const ruleColumns = [
    { key: 'ruleCode', label: 'Code', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary-500)' }}>{v}</span> },
    { key: 'standard', label: 'Standard', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v}</span> },
    { key: 'sensorType', label: 'Sensor Type', render: (v) => <span className="badge badge-neutral">{v}</span> },
    {
      key: 'threshold',
      label: 'Threshold',
      render: (_, row) => {
        if (row.minValue !== null && row.maxValue !== null) {
          return <span style={{ fontFamily: 'var(--font-mono)' }}>{row.minValue} - {row.maxValue}</span>;
        } else if (row.minValue !== null) {
          return <span style={{ fontFamily: 'var(--font-mono)' }}>&gt;= {row.minValue}</span>;
        } else if (row.maxValue !== null) {
          return <span style={{ fontFamily: 'var(--font-mono)' }}>&lt;= {row.maxValue}</span>;
        }
        return '—';
      }
    },
    { key: 'severity', label: 'Severity', render: (v) => <StatusBadge status={v} dot /> },
    {
      key: 'violationsCount',
      label: 'Violations',
      render: (_, row) => {
        const count = violations.filter(v => (v.ruleId?._id || v.ruleId) === row._id).length;
        return (
          <span style={{ fontWeight: 'var(--font-bold)', color: count > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {count}
          </span>
        );
      }
    },
    // Action column visible only to Admin
    ...(isAdmin ? [{
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-xs" onClick={() => handleOpenEdit(row)} title="Edit Rule">
            <Edit2 size={12} />
          </button>
          <button className="btn btn-danger btn-xs" onClick={() => handleDeleteRule(row._id)} title="Delete Rule">
            <Trash2 size={12} />
          </button>
        </div>
      )
    }] : [])
  ];

  const violationColumns = [
    { key: '_id', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v?.substring(18) || v}</span> },
    { key: 'ruleId', label: 'Rule Code', render: (v) => <span style={{ fontWeight: 'var(--font-medium)' }}>{v?.ruleCode || '—'}</span> },
    { key: 'nodeId', label: 'Asset Node', render: (v) => <span>{v?.nodeName || '—'}</span> },
    { key: 'actualValue', label: 'Value', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', fontWeight: 'var(--font-semibold)' }}>{v}</span> },
    { key: 'expectedValue', label: 'Limit', render: (v) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
    { key: 'severity', label: 'Severity', render: (v) => <StatusBadge status={v} dot /> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'createdAt', label: 'Detected', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> }
  ];

  // Timeline Items mapping
  const violationTimeline = filteredViolations.map(v => ({
    id: v._id,
    title: `${v.ruleId?.ruleCode || 'Violation'} — ${v.nodeId?.nodeName || 'Unknown'}`,
    description: `Value: ${v.actualValue} (Limit: ${v.expectedValue})`,
    time: timeAgo(v.createdAt),
    dotColor: v.severity?.toLowerCase() === 'critical' ? 'danger' : v.severity?.toLowerCase() === 'high' ? 'danger' : 'warning',
  }));

  // Calculations for summary KPI values
  const totalOpenViolations = stats ? (stats.violations.open + stats.violations.investigating) : 0;
  const complianceScore = stats
    ? (stats.violations.open > 0 ? (100 - stats.violations.open * 12.5).toFixed(1) + '%' : '100.0%')
    : '100.0%';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            <Shield size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            <span className="gradient-text">Compliance Center</span>
          </h1>
          <p>Rule enforcement and violation tracking</p>
        </div>
        {isAdmin && activeTab === 'rules' && (
          <div className="page-actions">
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              <Plus size={14} /> Create Rule
            </button>
          </div>
        )}
      </div>

      {/* KPI statistics summary cards (not shown for operator) */}
      {!isOperator && (
        loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} style={{ height: '110px', background: 'var(--surface-card)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-xl)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : error ? null : (
          <div className="kpi-grid">
            <KPICard label="Compliance Score" value={complianceScore} color={totalOpenViolations > 0 ? 'amber' : 'green'} icon="Shield" />
            <KPICard label="Active Rules" value={stats?.rules.active || 0} color="blue" icon="CheckSquare" />
            <KPICard label="Open Violations" value={totalOpenViolations} color="red" icon="AlertTriangle" />
            <KPICard label="Resolved Issues" value={stats?.violations.resolved || 0} color="teal" icon="CheckSquare" />
          </div>
        )
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab !== 'timeline' && activeTab !== 'stats' && (
        <div className="filter-bar">
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${activeTab === 'rules' ? 'rules' : 'violations'}...`} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem' }} />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ marginTop: '1rem' }}>Retry</button>
        </div>
      ) : (
        <>
          {activeTab === 'rules' && (
            <DataTable
              data={filteredRules}
              columns={ruleColumns}
              exportFilename="compliance_rules"
              emptyMessage="No compliance rules found"
            />
          )}

          {activeTab === 'violations' && (
            <DataTable
              data={filteredViolations}
              columns={violationColumns}
              exportFilename="violations"
              emptyMessage="No compliance violations recorded"
            />
          )}

          {activeTab === 'stats' && stats && (
            <div className="dashboard-grid">
              <div className="col-6">
                <ChartCard title="Violations by Severity" subtitle="Current active violations distribution">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
                    {Object.entries(stats.bySeverity).map(([severity, count]) => (
                      <div key={severity} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`kpi-stat-dot`} style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: severity === 'Critical' ? 'var(--color-danger)' : severity === 'High' ? 'var(--color-warning)' : 'var(--color-primary)' }} />
                          <span style={{ fontSize: 'var(--text-sm)' }}>{severity}</span>
                        </div>
                        <span style={{ fontWeight: 'var(--font-bold)' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </div>

              <div className="col-6">
                <ChartCard title="Violations by Sensor Type" subtitle="Current violations distribution by telemetry group">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
                    {Object.entries(stats.bySensorType).length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>No sensor violations found</div>
                    ) : (
                      Object.entries(stats.bySensorType).map(([sensor, count]) => (
                        <div key={sensor} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)' }}>
                          <span style={{ fontSize: 'var(--text-sm)' }}>{sensor}</span>
                          <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-warning)' }}>{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ChartCard>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <ChartCard title="Violation Timeline" subtitle="Chronological view of compliance breaches">
              {violationTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>No compliance violations recorded in timeline</div>
              ) : (
                <Timeline items={violationTimeline} />
              )}
            </ChartCard>
          )}
        </>
      )}

      {/* Create / Edit Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Compliance Rule' : 'Edit Compliance Rule'}
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label htmlFor="ruleCode">Rule Code</label>
            <input
              id="ruleCode"
              className="input"
              value={formData.ruleCode}
              onChange={(e) => setFormData({ ...formData, ruleCode: e.target.value })}
              placeholder="e.g. API617-TEMP"
              required
              disabled={modalMode === 'edit'}
            />
          </div>

          <div className="input-group">
            <label htmlFor="standard">Standard</label>
            <input
              id="standard"
              className="input"
              value={formData.standard}
              onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
              placeholder="e.g. API 617"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="sensorType">Sensor Type</label>
            <select
              id="sensorType"
              className="select"
              value={formData.sensorType}
              onChange={(e) => setFormData({ ...formData, sensorType: e.target.value })}
            >
              {SENSOR_TYPES.map(type => (
                <option key={type} value={type} style={{ background: '#0F121E' }}>{type}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label htmlFor="minValue">Min Value (Optional)</label>
              <input
                id="minValue"
                className="input"
                type="number"
                value={formData.minValue}
                onChange={(e) => setFormData({ ...formData, minValue: e.target.value })}
                placeholder="No min limit"
              />
            </div>
            <div className="input-group">
              <label htmlFor="maxValue">Max Value (Optional)</label>
              <input
                id="maxValue"
                className="input"
                type="number"
                value={formData.maxValue}
                onChange={(e) => setFormData({ ...formData, maxValue: e.target.value })}
                placeholder="No max limit"
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="severity">Severity</label>
            <select
              id="severity"
              className="select"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              {SEVERITIES.map(sev => (
                <option key={sev} value={sev} style={{ background: '#0F121E' }}>{sev}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide rule context and specifications..."
            />
          </div>

          {formError && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
