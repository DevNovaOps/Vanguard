import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import KPICard from '../../components/common/KPICard';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import { operatorKPIs as mockKPIs, sensors, routes } from '../../data/mockData';
import { incidentService } from '../../utils/incidentService';
import { timeAgo } from '../../utils/helpers';
import { Eye, AlertCircle, ArrowUpRight, FileText } from 'lucide-react';
import { downloadReport } from '../../utils/reportService';
import { io } from 'socket.io-client';

const sensorByType = ['temperature', 'vibration', 'pressure', 'gas', 'power', 'signal'].map(type => ({
  type: type.charAt(0).toUpperCase() + type.slice(1),
  count: sensors.filter(s => s.type === type).length,
  warnings: sensors.filter(s => s.type === type && s.status !== 'normal').length,
}));

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

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.02,
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};


export default function OperatorDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadReport('incidents', 'pdf', 'Incident Report');
    } catch (err) {
      alert('Failed to export report: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const fetchIncidentsAndStats = useCallback(async () => {
    try {
      const res = await incidentService.getIncidents();
      if (res.success && res.data) {
        setIncidents(res.data);
      }
      const statsRes = await incidentService.getDashboardStats();
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('[OPERATOR-DASHBOARD] Fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchIncidentsAndStats();
  }, [fetchIncidentsAndStats]);

  // Hook up Socket.IO
  useEffect(() => {
    const socket = io();

    const handleUpdate = () => {
      fetchIncidentsAndStats();
    };

    socket.on('incident:create', handleUpdate);
    socket.on('incident:update', handleUpdate);
    socket.on('incident:resolve', handleUpdate);
    socket.on('incident:close', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchIncidentsAndStats]);

  // Merge live incident counts with mock KPIs
  const currentIncidentsCount = stats ? stats.openIncidents : incidents.filter(i => i.status !== 'Closed').length;

  const liveKPIs = mockKPIs.map(kpi => {
    if (kpi.label === 'Current Incidents') {
      return {
        ...kpi,
        value: currentIncidentsCount
      };
    }
    return kpi;
  });

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <motion.div className="page-header" variants={headerVariants}>
        <div>
          <h1><span className="gradient-text">Operator Dashboard</span></h1>
          <p>Railway operations monitoring center</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <motion.button
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={exporting}
          >
            <FileText size={14} /> {exporting ? 'Exporting...' : 'Incident Report'}
          </motion.button>
          <span className="live-indicator">LIVE</span>
        </div>
      </motion.div>

      <motion.div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }} variants={itemVariants}>
        {liveKPIs.map((kpi, i) => (
          <KPICard key={kpi.label} {...kpi} delay={i * 80} />
        ))}
      </motion.div>

      <motion.div className="dashboard-grid" variants={containerVariants}>
        {/* Sensor Distribution */}
        <motion.div className="col-8" variants={itemVariants}>
          <ChartCard title="Sensor Distribution" subtitle="Sensors by type with warnings">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sensorByType} barGap={8}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="warnings" fill="var(--color-warning)" radius={[6, 6, 0, 0]} name="Warnings" opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>

        {/* Active Routes */}
        <motion.div className="col-4" variants={itemVariants}>
          <ChartCard title="Active Routes" subtitle={`${routes.length} routes monitored`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
              {routes.map((route, i) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-lg)', transition: 'all 200ms ease',
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{route.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{route.distance} km</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 40, height: 4, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        style={{
                          height: '100%',
                          background: route.load > 85 ? 'var(--color-danger)' : route.load > 70 ? 'var(--color-warning)' : 'var(--color-success)',
                          borderRadius: 4, boxShadow: route.load > 85 ? '0 0 6px rgba(220,38,38,0.4)' : 'none',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${route.load}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 30 }}>{route.load}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </motion.div>

        {/* Incident Queue */}
        <motion.div className="col-12" variants={itemVariants}>
          <ChartCard title="Incident Queue" subtitle="Active incidents sorted by priority">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Severity</th>
                    <th>Title</th>
                    <th>Asset</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ position: 'relative' }}>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                        No active incidents recorded in queue
                      </td>
                    </tr>
                  ) : (
                    incidents.slice(0, 5).map((inc, i) => (
                      <motion.tr
                        key={inc._id || inc.incidentId}
                        variants={rowVariants}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                      >
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{inc.incidentId || inc._id}</td>
                        <td><StatusBadge status={inc.severity} dot /></td>
                        <td style={{ fontWeight: 'var(--font-medium)' }}>{inc.title}</td>
                        <td>{inc.nodeId?.nodeName || 'Unknown Asset'}</td>
                        <td>
                          <span style={{
                            fontWeight: 'var(--font-bold)',
                            color: inc.riskScore >= 80 ? 'var(--color-danger)' : inc.riskScore >= 50 ? 'var(--color-warning)' : 'var(--text-primary)',
                            textShadow: inc.riskScore >= 80 ? '0 0 8px rgba(220,38,38,0.3)' : 'none',
                          }}>{inc.riskScore}</span>
                        </td>
                        <td><StatusBadge status={inc.status} /></td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(inc.createdAt)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" title="View"><Eye size={14} /></button>
                          <button className="btn btn-ghost btn-sm" title="Action"><ArrowUpRight size={14} /></button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}


