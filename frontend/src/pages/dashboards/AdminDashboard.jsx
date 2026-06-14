import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import KPICard from '../../components/common/KPICard';
import ChartCard from '../../components/common/ChartCard';
import Timeline from '../../components/common/Timeline';
import StatusBadge from '../../components/common/StatusBadge';
import { adminKPIs, systemHealthData, riskTrendData, webhooks } from '../../data/mockData';
import { auditService } from '../../utils/auditService.js';
import { webhookService } from '../../utils/webhookService.js';
import { io } from 'socket.io-client';
import { formatDateTime, timeAgo } from '../../utils/helpers';
import { useSimulation } from '../../contexts/SimulationContext';
import { Users, Play, Settings, Activity, Shield, AlertTriangle, Zap, Bot, LayoutDashboard } from 'lucide-react';
import { authService } from '../../utils/authService';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

const INTEL_ITEMS = [
  { text: 'Sensor S-011 reporting anomaly — Bhusawal Power Hub', dot: 'danger', time: '2s ago' },
  { text: 'Risk score increased to 82 for TN-011', dot: 'warning', time: '15s ago' },
  { text: 'AI mitigation triggered — Speed restriction applied', dot: 'info', time: '32s ago' },
  { text: 'Compliance audit completed — 94.2% score', dot: 'success', time: '1m ago' },
  { text: 'Sensor calibration verified — S-007', dot: 'success', time: '2m ago' },
  { text: 'New incident INC-2848 auto-generated', dot: 'danger', time: '3m ago' },
  { text: 'Power rerouting via Jhansi Power Hub', dot: 'info', time: '5m ago' },
];

export default function AdminDashboard() {
  const { events } = useSimulation();
  const [intelItems, setIntelItems] = useState(INTEL_ITEMS);

  const [showUserManagement, setShowUserManagement] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [webhookList, setWebhookList] = useState([]);
  const [webhookKPIs, setWebhookKPIs] = useState(null);

  const fetchDashboardAuditData = async () => {
    try {
      const logsRes = await auditService.getAuditLogs({ limit: 5 });
      if (logsRes.success && logsRes.data && logsRes.data.logs) {
        const mapped = logsRes.data.logs.map(log => ({
          id: log.auditId,
          title: log.action,
          description: `${log.username || 'System'} — ${log.module}`,
          time: timeAgo(log.timestamp || log.createdAt),
          dotColor: log.severity === 'Critical' ? 'danger' : (log.severity === 'Warning' ? 'warning' : 'success'),
        }));
        setRecentAudits(mapped);
      }

      const statsRes = await auditService.getDashboardAuditStats();
      if (statsRes.success) {
        setAuditStats(statsRes.data);
      }
    } catch (err) {
      console.error('[ADMIN-DASHBOARD-AUDIT-ERROR]', err.message);
    }
  };

  const fetchDashboardWebhookData = async () => {
    try {
      const res = await webhookService.getDashboardWebhooks();
      if (res.success && res.data) {
        setWebhookList(res.data.webhooks || []);
        setWebhookKPIs(res.data.stats || null);
      }
    } catch (err) {
      console.error('[ADMIN-DASHBOARD-WEBHOOK-ERROR]', err.message);
    }
  };

  useEffect(() => {
    fetchDashboardAuditData();
    fetchDashboardWebhookData();
  }, []);

  useEffect(() => {
    const socket = io();
    socket.on('connect', () => {
      console.log('[SOCKET] Connected to Admin Dashboard stream');
    });

    socket.on('audit:create', () => {
      fetchDashboardAuditData();
    });

    socket.on('webhook:create', () => {
      fetchDashboardWebhookData();
    });

    socket.on('webhook:update', () => {
      fetchDashboardWebhookData();
    });

    socket.on('webhook:delivery', () => {
      fetchDashboardWebhookData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const res = await authService.getAllUsers();
      if (res.success) {
        setUsersList(res.users);
      } else {
        setUsersError('Failed to load users');
      }
    } catch (err) {
      setUsersError(err.message || 'Error fetching users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showUserManagement) {
      fetchUsers();
    }
  }, [showUserManagement]);

  const handleApprove = async (userId) => {
    try {
      const res = await authService.approveUser(userId);
      if (res.success) {
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, isActive: true } : u));
      }
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject and delete this user?')) return;
    try {
      const res = await authService.rejectUser(userId);
      if (res.success) {
        setUsersList(prev => prev.filter(u => u._id !== userId));
      }
    } catch (err) {
      alert('Rejection failed: ' + err.message);
    }
  };

  const normalizeUserRole = (rawRole) => {
    const roleMap = {
      'Admin': 'admin',
      'Operator': 'operator',
      'SafetyOfficer': 'safety_officer',
      'Manager': 'manager'
    };
    return roleMap[rawRole] || rawRole?.toLowerCase() || 'operator';
  };

  // Rotate intelligence feed
  useEffect(() => {
    const interval = setInterval(() => {
      setIntelItems(prev => {
        const shifted = [...prev];
        shifted.push(shifted.shift());
        return [...shifted];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <motion.div className="page-header" variants={headerVariants}>
        <div>
          <h1><span className="gradient-text">Admin Dashboard</span></h1>
          <p>Complete platform administration and oversight</p>
        </div>
        <div className="page-actions">
          <motion.button
            className={`btn ${showUserManagement ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setShowUserManagement(!showUserManagement)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {showUserManagement ? <LayoutDashboard size={14} /> : <Users size={14} />}
            {showUserManagement ? 'View Dashboard' : 'Users'}
          </motion.button>
        </div>
      </motion.div>

      <motion.div className="kpi-grid" variants={itemVariants}>
        {(() => {
          const displayKPIs = [
            adminKPIs[0],
            adminKPIs[1],
            adminKPIs[2],
            {
              label: 'Critical Audits',
              value: auditStats ? auditStats.criticalEvents : 0,
              trend: auditStats ? `${auditStats.warningEvents} Warnings` : '0 Warnings',
              trendDir: 'down',
              color: 'red',
              icon: 'AlertTriangle'
            }
          ];
          return displayKPIs.map((kpi, i) => (
            <KPICard key={kpi.label} {...kpi} delay={i * 80} />
          ));
        })()}
      </motion.div>

      {showUserManagement ? (
        <motion.div
          variants={containerVariants}
          className="dashboard-grid"
          style={{ gridTemplateColumns: '1fr' }}
        >
          <motion.div className="col-12" variants={itemVariants}>
            <ChartCard title="Platform Registrations & Approvals" subtitle="Manage operator, safety officer, and manager system access">
              {loadingUsers ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading registered users list...
                </div>
              ) : usersError ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-danger)' }}>
                  {usersError}
                </div>
              ) : usersList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No other users registered on this platform yet.
                </div>
              ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-secondary)', height: '40px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                        <th style={{ padding: '0.75rem' }}>FULL NAME</th>
                        <th style={{ padding: '0.75rem' }}>EMAIL</th>
                        <th style={{ padding: '0.75rem' }}>ROLE</th>
                        <th style={{ padding: '0.75rem' }}>DEPARTMENT</th>
                        <th style={{ padding: '0.75rem' }}>STATUS</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u._id} style={{ borderBottom: '1px solid var(--border-secondary)', height: '56px', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 'var(--font-medium)' }}>{u.name}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <StatusBadge status={normalizeUserRole(u.role)} />
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-tertiary)' }}>{u.department || 'N/A'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-semibold)',
                              color: u.isActive ? 'var(--color-success-400)' : 'var(--color-warning-400)',
                            }}>
                              <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: u.isActive ? 'var(--color-success)' : 'var(--color-warning)',
                              }} />
                              {u.isActive ? 'Active' : 'Pending Approval'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              {!u.isActive && (
                                <motion.button
                                  className="btn btn-primary btn-xs"
                                  onClick={() => handleApprove(u._id)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', background: 'var(--color-success)', border: 'none' }}
                                >
                                  Approve
                                </motion.button>
                              )}
                              <motion.button
                                className="btn btn-secondary btn-xs"
                                onClick={() => handleReject(u._id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                              >
                                {u.isActive ? 'Deactivate' : 'Reject'}
                              </motion.button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </motion.div>
        </motion.div>
      ) : (
        <>
          <motion.div className="dashboard-grid" variants={containerVariants}>
            {/* Risk Trend Chart */}
            <motion.div className="col-8" variants={itemVariants}>
              <ChartCard title="Risk & Incident Trends" subtitle="Last 30 days">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={riskTrendData}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5B87DF" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#5B87DF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#DC2626" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)', boxShadow: 'var(--shadow-lg)' }} />
                    <Area type="monotone" dataKey="risk" stroke="#5B87DF" fill="url(#riskGrad)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="incidents" stroke="#F87171" fill="url(#incidentGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </motion.div>

            {/* System Health Donut */}
            <motion.div className="col-4" variants={itemVariants}>
              <ChartCard title="System Health" subtitle="Node status distribution">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={systemHealthData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      {systemHealthData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {systemHealthData.map(item => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}40` }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </motion.div>

            {/* Live Intelligence Stream */}
            <motion.div className="col-12" variants={itemVariants}>
              <ChartCard title="Live Intelligence Stream" subtitle="Real-time platform activity">
                <div className="intel-feed">
                  <AnimatePresence mode="popLayout">
                    {intelItems.slice(0, 5).map((item, i) => (
                      <motion.div
                        key={`${item.text}-${i}`}
                        className="intel-feed-item"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        layout
                      >
                        <div className={`feed-dot ${item.dot}`} />
                        <span style={{ flex: 1 }}>{item.text}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{item.time}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ChartCard>
            </motion.div>

            {/* Audit Timeline */}
            <motion.div className="col-6" variants={itemVariants}>
              <ChartCard title="Audit Timeline" subtitle="Recent system activities">
                <Timeline items={recentAudits} />
              </ChartCard>
            </motion.div>

            {/* Webhook Status */}
            <motion.div className="col-6" variants={itemVariants}>
              <ChartCard title="Webhook Status" subtitle="Integration health">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {webhookList.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                      No webhooks configured. Configure them in the Webhook Center.
                    </div>
                  ) : (
                    webhookList.map((wh, i) => (
                      <motion.div
                        key={wh.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                          borderRadius: 'var(--radius-lg)', transition: 'all 200ms ease'
                        }}
                        whileHover={{ backgroundColor: 'rgba(26, 86, 219, 0.04)' }}
                      >
                        <div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{wh.name}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{wh.events.join(', ')}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{wh.avgLatency}ms</span>
                          <StatusBadge status={wh.status} />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ChartCard>
            </motion.div>
          </motion.div>

          {/* Live Simulation Events */}
          {events.length > 0 && (
            <motion.div style={{ marginTop: '1.5rem' }} variants={itemVariants}>
              <ChartCard title="Simulation Events" subtitle="Real-time simulation feed">
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {events.slice(0, 10).map((evt, i) => (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="intel-feed-item"
                    >
                      <StatusBadge status={evt.severity} />
                      <span style={{ flex: 1 }}>{evt.title}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{evt.description}</span>
                    </motion.div>
                  ))}
                </div>
              </ChartCard>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

