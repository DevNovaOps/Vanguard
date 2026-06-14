import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import KPICard from '../../components/common/KPICard';
import Modal from '../../components/common/Modal';
import SearchInput from '../../components/common/SearchInput';
import { webhookService } from '../../utils/webhookService.js';
import { useAuth } from '../../contexts/AuthContext';
import { timeAgo, formatDateTime } from '../../utils/helpers';
import { io } from 'socket.io-client';
import {
  Webhook, Plus, Trash2, Edit2, Play, Check, X, RefreshCw, 
  ExternalLink, Eye, Info, Clock, AlertTriangle, ShieldAlert,
  Settings, Server, CheckCircle2, XCircle
} from 'lucide-react';

const EVENT_TYPES = [
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'COMPLIANCE_VIOLATION',
  'RISK_THRESHOLD_EXCEEDED',
  'RISK_LEVEL_CHANGED',
  'INCIDENT_CREATED',
  'INCIDENT_UPDATED',
  'INCIDENT_RESOLVED',
  'INCIDENT_CLOSED',
  'AGENT_ACTION_EXECUTED',
  'MITIGATION_EXECUTED',
  'SIMULATION_STARTED',
  'SIMULATION_COMPLETED',
  'AUDIT_CRITICAL'
];
export default function WebhookCenter() {
  const { user } = useAuth();
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  // State Variables
  const [webhooks, setWebhooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    totalWebhooks: 0,
    activeWebhooks: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageLatency: 0,
    successRate: 100
  });

  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  
  // Form State
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'POST',
    subscribedEvents: [],
    headersJson: '{}'
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Test target state
  const [testingWebhookId, setTestingWebhookId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Fetch all webhooks and statistics
  const fetchData = async () => {
    setLoading(true);
    try {
      const [webhooksRes, statsRes, deliveriesRes] = await Promise.all([
        webhookService.getWebhooks(),
        webhookService.getWebhookStats(),
        webhookService.getWebhookDeliveries({ limit: 500 }) // Fetch large batch for local filtering/pagination
      ]);

      if (webhooksRes.success) setWebhooks(webhooksRes.data || []);
      if (statsRes.success) setStats(statsRes.data || {});
      if (deliveriesRes.success && deliveriesRes.data) {
        setDeliveries(deliveriesRes.data.deliveries || []);
      }
    } catch (err) {
      console.error('[WEBHOOK-CENTER-FETCH-ERROR]', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Web Sockets integration for real-time updates
  useEffect(() => {
    const socket = io();
    socket.on('connect', () => {
      console.log('[SOCKET] Connected to Webhook Center stream');
    });

    socket.on('webhook:create', () => {
      fetchData();
    });

    socket.on('webhook:update', () => {
      fetchData();
    });

    socket.on('webhook:delivery', (newDelivery) => {
      // Add new delivery log at the top of the list if not already there
      setDeliveries((prev) => {
        if (prev.some((d) => d.id === newDelivery.id || d.deliveryId === newDelivery.id)) return prev;
        
        // Mapped delivery object matching DB schema format
        const mapped = {
          id: newDelivery.id,
          deliveryId: newDelivery.id,
          webhookId: newDelivery.webhookId,
          eventType: newDelivery.eventType,
          status: newDelivery.status,
          responseCode: newDelivery.responseCode,
          latency: newDelivery.latency,
          timestamp: newDelivery.timestamp
        };
        return [mapped, ...prev];
      });

      // Refetch stats and webhooks configuration to update averages
      webhookService.getWebhooks().then(res => {
        if (res.success) setWebhooks(res.data || []);
      });
      webhookService.getWebhookStats().then(res => {
        if (res.success) setStats(res.data || {});
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(log => {
      const matchStatus = logFilter === 'all' || log.status.toLowerCase() === logFilter.toLowerCase();
      const matchSearch = !searchQuery || 
        log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.webhookId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(log.responseCode || '').includes(searchQuery);
      return matchStatus && matchSearch;
    });
  }, [deliveries, logFilter, searchQuery]);

  // Chart Data preparation
  const chartData = useMemo(() => {
    return webhooks.slice(0, 8).map(wh => ({
      name: wh.name.length > 15 ? wh.name.substring(0, 15) + '...' : wh.name,
      latency: wh.averageLatency || 0,
      success: wh.successRate || 0
    }));
  }, [webhooks]);

  // Form Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) return setFormError('Name is required');
    if (!formData.endpoint.trim()) return setFormError('Endpoint URL is required');
    if (formData.subscribedEvents.length === 0) return setFormError('Please select at least one event type');

    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(formData.headersJson);
    } catch (err) {
      return setFormError('Headers must be valid JSON');
    }

    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        endpoint: formData.endpoint,
        method: formData.method,
        subscribedEvents: formData.subscribedEvents,
        headers: parsedHeaders
      };

      let res;
      if (formMode === 'create') {
        res = await webhookService.createWebhook(payload);
      } else {
        res = await webhookService.updateWebhook(selectedWebhook.webhookId, payload);
      }

      if (res.success) {
        setIsFormModalOpen(false);
        fetchData();
      } else {
        setFormError(res.message || 'Error saving webhook');
      }
    } catch (err) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Webhook Handler
  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Are you sure you want to delete this webhook subscription? All associated logs will be deleted.')) return;
    try {
      const res = await webhookService.deleteWebhook(id);
      if (res.success) {
        setIsDetailsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert('Failed to delete webhook: ' + err.message);
    }
  };

  // Toggle Webhook Active status
  const handleToggleStatus = async (webhook) => {
    const nextActive = !webhook.isActive;
    try {
      const res = await webhookService.toggleWebhookStatus(webhook.webhookId, nextActive);
      if (res.success) {
        setWebhooks(prev => prev.map(w => w.webhookId === webhook.webhookId ? { ...w, isActive: nextActive, status: nextActive ? 'Active' : 'Inactive' } : w));
      }
    } catch (err) {
      alert('Failed to toggle webhook state: ' + err.message);
    }
  };

  // Run mock webhook test
  const handleTestWebhook = async (id) => {
    setTestingWebhookId(id);
    setTestResult(null);
    try {
      const res = await webhookService.testWebhook(id);
      if (res.success) {
        setTestResult({
          success: res.data.status === 'Success' || res.data.status === 'Retrying',
          message: `Test completed with status: ${res.data.status}`,
          details: res.data
        });
        fetchData(); // reload deliveries & stats
      } else {
        setTestResult({
          success: false,
          message: res.message || 'Test dispatch failed'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Test trigger failed'
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Manual retry of a failed delivery log
  const handleRetryDelivery = async (deliveryId) => {
    try {
      const res = await webhookService.retryDelivery(deliveryId);
      if (res.success) {
        alert('Retry initiated successfully. Check logs table for the updated delivery state.');
        fetchData();
      }
    } catch (err) {
      alert('Retry failed: ' + err.message);
    }
  };

  // Form open helper
  const openCreateModal = () => {
    setFormMode('create');
    setFormData({
      name: '',
      description: '',
      endpoint: '',
      method: 'POST',
      subscribedEvents: [],
      headersJson: '{}'
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (webhook) => {
    setFormMode('edit');
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      description: webhook.description || '',
      endpoint: webhook.endpoint,
      method: webhook.method || 'POST',
      subscribedEvents: webhook.subscribedEvents || [],
      headersJson: JSON.stringify(webhook.headers || {}, null, 2)
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openDetailsModal = (webhook) => {
    setSelectedWebhook(webhook);
    setTestResult(null);
    setIsDetailsModalOpen(true);
  };

  // Checkbox handlers
  const handleEventCheckboxChange = (event) => {
    setFormData(prev => {
      const subs = [...prev.subscribedEvents];
      if (subs.includes(event)) {
        return { ...prev, subscribedEvents: subs.filter(e => e !== event) };
      } else {
        return { ...prev, subscribedEvents: [...subs, event] };
      }
    });
  };

  const handleSelectAllEvents = () => {
    setFormData(prev => ({
      ...prev,
      subscribedEvents: prev.subscribedEvents.length === EVENT_TYPES.length ? [] : [...EVENT_TYPES]
    }));
  };

  // DataTable column definitions
  const eventColumns = [
    { key: 'deliveryId', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v}</span> },
    { key: 'webhookId', label: 'Webhook ID', render: (v) => {
      const wh = webhooks.find(w => w.webhookId === v);
      return <span style={{ fontWeight: 'var(--font-medium)' }} title={wh?.endpoint}>{wh?.name || v}</span>;
    }},
    { key: 'eventType', label: 'Event', render: (v) => <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{v}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'responseCode', label: 'Response', render: (v) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: v >= 200 && v < 300 ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {v || '—'}
      </span>
    )},
    { key: 'latency', label: 'Latency', render: (v) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v ? `${v}ms` : '—'}</span> },
    { key: 'timestamp', label: 'Time', render: (v) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v)}</span> },
    { key: '_actions', label: 'Actions', sortable: false, render: (_, row) => (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {row.status === 'Failed' && isAdmin && (
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}
            onClick={(e) => { e.stopPropagation(); handleRetryDelivery(row.deliveryId); }}
          >
            <RefreshCw size={10} style={{ marginRight: '4px', display: 'inline' }} />
            Retry
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div id="webhook-center-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Webhook size={26} style={{ color: 'var(--accent-primary)' }} />
            <span className="gradient-text">Webhook Center</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Configure external webhooks, view real-time delivery logs, and track integration metrics</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Create Webhook
          </button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid animate-fade-in">
        <KPICard label="Active Integrations" value={`${stats.activeWebhooks}/${stats.totalWebhooks}`} icon="Server" color="blue" delay={0} />
        <KPICard label="Success Rate" value={`${stats.successRate || 100}%`} icon="CheckCircle2" color="green" delay={60} />
        <KPICard label="Avg Latency" value={stats.averageLatency ? `${stats.averageLatency}ms` : '—'} icon="Clock" color="purple" delay={120} />
        <KPICard label="Total Dispatches" value={stats.successfulDeliveries + stats.failedDeliveries || 0} icon="Activity" color="orange" delay={180} />
      </div>

      {/* Webhooks Configured Cards Grid */}
      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: '0.75rem' }}>Configured Target Endpoints</h3>
      
      {webhooks.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)',
          border: '1px dashed var(--border-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
          color: 'var(--text-secondary)'
        }}>
          <Server size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
          <p>No webhook integrations configured. Create one to begin sending real-time events to third-party APIs.</p>
        </div>
      ) : (
        <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {webhooks.map((wh, i) => (
            <div 
              key={wh.webhookId} 
              className="card animate-slide-up" 
              style={{ 
                animationDelay: `${i * 60}ms`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                border: wh.status === 'Error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-primary)',
                background: wh.status === 'Error' ? 'linear-gradient(to bottom, rgba(239,68,68,0.02), var(--surface-card))' : 'var(--surface-card)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>{wh.name}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <StatusBadge status={wh.status} dot />
                  </div>
                </div>
                
                {wh.description && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {wh.description}
                  </p>
                )}

                <div style={{
                  fontSize: 'var(--text-xs)', 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  background: 'rgba(0,0,0,0.15)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.75rem',
                  wordBreak: 'break-all',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span className="text-truncate" style={{ maxWidth: '85%' }}>{wh.endpoint}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{wh.method}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {wh.subscribedEvents.slice(0, 3).map(e => (
                    <span key={e} className="badge badge-neutral" style={{ fontSize: '9px', padding: '0.1rem 0.3rem' }}>{e}</span>
                  ))}
                  {wh.subscribedEvents.length > 3 && (
                    <span className="badge badge-neutral" style={{ fontSize: '9px', padding: '0.1rem 0.3rem' }}>+{wh.subscribedEvents.length - 3} more</span>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  <span>Success Rate: <strong style={{ color: wh.successRate >= 95 ? 'var(--color-success)' : 'var(--color-warning)' }}>{wh.successRate}%</strong></span>
                  <span>Latency: <strong>{wh.averageLatency || 0}ms</strong></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isAdmin ? (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                      <input 
                        type="checkbox" 
                        checked={wh.isActive} 
                        onChange={() => handleToggleStatus(wh)}
                        style={{ width: '14px', height: '14px', accentColor: 'var(--color-primary-500)' }}
                      />
                      <span>Active</span>
                    </label>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{wh.isActive ? 'Active' : 'Inactive'}</span>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openDetailsModal(wh)} title="View metrics & test dispatch">
                      <Eye size={12} />
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEditModal(wh)} title="Edit configuration">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-secondary btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteWebhook(wh.webhookId)} title="Delete integration">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Charts Grid */}
      {webhooks.length > 0 && (
        <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="col-6">
            <ChartCard title="Latency by Integration" subtitle="Average round-trip delay (ms)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--chart-text)' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="latency" fill="#5B87DF" radius={[4, 4, 0, 0]} name="Latency (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="col-6">
            <ChartCard title="Health Success Rates" subtitle="Percentage of successful HTTP dispatches">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--chart-text)' }} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="success" fill="#10B981" radius={[4, 4, 0, 0]} name="Success %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Deliveries Logs Section */}
      <ChartCard title="Delivery Transaction Logs" subtitle="HTTP endpoint request records ledger">
        <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by Event Type, Webhook ID, status..." />
          
          <select 
            className="select" 
            style={{ width: 'auto', minWidth: '150px' }} 
            value={logFilter} 
            onChange={e => setLogFilter(e.target.value)}
          >
            <option value="all">All Dispatches</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>

          <button 
            className="btn btn-secondary btn-icon" 
            onClick={fetchData} 
            title="Refresh logs ledger"
            style={{ padding: '0.5rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && deliveries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading event dispatches from transaction ledger...
          </div>
        ) : (
          <DataTable 
            data={filteredDeliveries} 
            columns={eventColumns} 
            pageSize={10} 
            exportFilename="webhook_delivery_logs" 
            emptyMessage="No matching dispatch records found."
          />
        )}
      </ChartCard>

      {/* MODAL 1: Create or Edit Webhook */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={formMode === 'create' ? 'Register Webhook Integration' : 'Modify Webhook Integration'}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleFormSubmit} disabled={formSubmitting}>
              {formSubmitting ? 'Saving Configuration...' : 'Save Integration'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div style={{
              display: 'flex', gap: '0.5rem', alignItems: 'center',
              padding: '0.75rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444', fontSize: 'var(--text-xs)'
            }}>
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Friendly Name</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Slack Incident Operations"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: 'var(--text-xs)', fontWeight: 600 }}>HTTP Delivery Method</label>
              <select 
                className="select"
                value={formData.method}
                onChange={e => setFormData({ ...formData, method: e.target.value })}
              >
                <option value="POST">POST (Recommended)</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="GET">GET</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Target URL Endpoint</label>
            <input 
              type="url" 
              className="input" 
              placeholder="https://hooks.slack.com/services/..."
              value={formData.endpoint}
              onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
              required
            />
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
              For testing mock errors, use domains like slack.com, pagerduty.com, etc. and append <code>?mockResponse=fail</code> or <code>?mockResponse=timeout</code>.
            </span>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Description</label>
            <textarea 
              className="input" 
              rows={2}
              placeholder="Describe what external system this integration connects to..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Subscribed Event Topics</label>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '10px', padding: '0.1rem 0.5rem' }} 
                onClick={handleSelectAllEvents}
              >
                {formData.subscribedEvents.length === EVENT_TYPES.length ? 'Clear All' : 'Select All'}
              </button>
            </div>

            <div style={{
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '0.5rem', 
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.15)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {EVENT_TYPES.map(event => (
                <label 
                  key={event} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    fontSize: '11px',
                    color: formData.subscribedEvents.includes(event) ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="checkbox"
                    checked={formData.subscribedEvents.includes(event)}
                    onChange={() => handleEventCheckboxChange(event)}
                    style={{ width: '12px', height: '12px' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Custom Headers (JSON Object)</label>
            <textarea 
              className="input" 
              rows={3}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              placeholder={'{ "X-Custom-Header": "Value" }'}
              value={formData.headersJson}
              onChange={e => setFormData({ ...formData, headersJson: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* MODAL 2: View Webhook Details & Trigger Test */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedWebhook ? `Integration Metrics: ${selectedWebhook.name}` : 'Integration Details'}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setIsDetailsModalOpen(false)}>Close</button>
            {isAdmin && selectedWebhook && (
              <button 
                className="btn btn-primary" 
                onClick={() => handleTestWebhook(selectedWebhook.webhookId)}
                disabled={testingWebhookId === selectedWebhook.webhookId}
              >
                {testingWebhookId === selectedWebhook.webhookId ? (
                  <>Sending Test payload...</>
                ) : (
                  <><Play size={14} style={{ marginRight: '6px', display: 'inline' }} /> Dispatch Test Event</>
                )}
              </button>
            )}
          </div>
        }
      >
        {selectedWebhook && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Health Score Notice */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem', background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)'
            }}>
              <div>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Endpoint Targets</h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                  {selectedWebhook.method} — {selectedWebhook.endpoint}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Status</span>
                <div style={{ marginTop: '0.25rem' }}><StatusBadge status={selectedWebhook.status} /></div>
              </div>
            </div>

            {/* Performance Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Transactions Count</span>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                  {selectedWebhook.totalRequests || 0}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {selectedWebhook.successfulRequests || 0} OK / {selectedWebhook.failedRequests || 0} ERR
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Success Rate</span>
                <div style={{ 
                  fontSize: 'var(--text-lg)', 
                  fontWeight: 700, 
                  marginTop: '0.25rem',
                  color: selectedWebhook.successRate >= 90 ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {selectedWebhook.successRate || 100}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Target SLI: &gt;90%
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Average Latency</span>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                  {selectedWebhook.averageLatency || 0}ms
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Target response: &lt;500ms
                </div>
              </div>
            </div>

            {/* Subscriptions */}
            <div>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Subscribed Event Topics ({selectedWebhook.subscribedEvents?.length})</h4>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selectedWebhook.subscribedEvents?.map(e => (
                  <span key={e} className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{e}</span>
                ))}
              </div>
            </div>

            {/* Test Results Output */}
            {testResult && (
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: testResult.success ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                background: testResult.success ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {testResult.success ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} /> : <XCircle size={16} style={{ color: 'var(--color-danger)' }} />}
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {testResult.message}
                  </span>
                </div>
                
                {testResult.details && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Dispatch Code: <strong>{testResult.details.responseCode || '—'}</strong></span>
                    <span>Dispatch Latency: <strong>{testResult.details.latency || 0}ms</strong></span>
                    <span style={{ gridColumn: 'span 2', marginTop: '0.25rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '4px', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto' }}>
                      Payload Response: {testResult.details.responseBody || '(empty response)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span>Registered: {formatDateTime(selectedWebhook.createdAt)}</span>
              {selectedWebhook.lastTriggeredAt && (
                <span>Last Dispatched: {timeAgo(selectedWebhook.lastTriggeredAt)}</span>
              )}
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}
