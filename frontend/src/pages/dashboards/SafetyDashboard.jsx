import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import KPICard from '../../components/common/KPICard';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import { complianceTrendData } from '../../data/mockData';
import { complianceService } from '../../utils/complianceService';
import { incidentService } from '../../utils/incidentService';
import { timeAgo } from '../../utils/helpers';
import { FileText, CheckCircle, AlertOctagon } from 'lucide-react';
import { io } from 'socket.io-client';


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

export default function SafetyDashboard() {
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSafetyData = useCallback(async () => {
    try {
      const vRes = await complianceService.getViolations({ limit: 5 });
      if (vRes.success) {
        setViolations(vRes.violations);
      }
      const sRes = await complianceService.getDashboardStats();
      if (sRes.success) {
        setStats(sRes.stats);
      }
      const iRes = await incidentService.getIncidents();
      if (iRes.success && iRes.data) {
        setIncidents(iRes.data);
      }
    } catch (err) {
      console.error('[SAFETY-DASHBOARD] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSafetyData();
  }, [fetchSafetyData]);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = io();

    const handleUpdate = () => {
      fetchSafetyData();
    };

    socket.on('incident:create', handleUpdate);
    socket.on('incident:update', handleUpdate);
    socket.on('incident:resolve', handleUpdate);
    socket.on('incident:close', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchSafetyData]);

  const totalOpenViolations = stats ? (stats.violations.open + stats.violations.investigating) : 0;
  const complianceScore = stats
    ? (stats.violations.open > 0 ? (100 - stats.violations.open * 12.5).toFixed(1) + '%' : '100.0%')
    : '100.0%';

  // Aggregate incident severity distribution dynamically
  const lowCount = incidents.filter(i => i.severity === 'Low').length;
  const mediumCount = incidents.filter(i => i.severity === 'Medium').length;
  const highCount = incidents.filter(i => i.severity === 'High').length;
  const criticalCount = incidents.filter(i => i.severity === 'Critical').length;

  const liveIncidentSeverityData = [
    { name: 'Low', value: lowCount || 0, color: '#059669' },
    { name: 'Medium', value: mediumCount || 0, color: '#D97706' },
    { name: 'High', value: highCount || 0, color: '#F97316' },
    { name: 'Critical', value: criticalCount || 0, color: '#DC2626' }
  ];

  // If there are no incidents, show a default empty layout or mock distribution for visual aid
  const hasIncidentData = lowCount + mediumCount + highCount + criticalCount > 0;
  const pieData = hasIncidentData ? liveIncidentSeverityData : [
    { name: 'Low', value: 1, color: '#059669' },
    { name: 'Medium', value: 1, color: '#D97706' },
    { name: 'High', value: 1, color: '#F97316' },
    { name: 'Critical', value: 1, color: '#DC2626' }
  ];

  const liveSafetyKPIs = [
    { label: 'Compliance Score', value: complianceScore, trend: stats?.violations.open > 0 ? '-1.8%' : '+0.5%', trendDir: stats?.violations.open > 0 ? 'down' : 'up', color: totalOpenViolations > 0 ? 'amber' : 'green', icon: 'Shield' },
    { label: 'Active Violations', value: totalOpenViolations, trend: stats ? (totalOpenViolations > 0 ? '+1' : '0') : '0', trendDir: totalOpenViolations > 0 ? 'down' : 'up', color: 'red', icon: 'AlertOctagon' },
    { label: 'Critical Risks', value: stats ? stats.bySeverity.Critical : 0, trend: '0', trendDir: 'up', color: 'red', icon: 'Flame' },
    { label: 'Emergency Actions', value: 3, trend: '+1', trendDir: 'down', color: 'amber', icon: 'Siren' },
    { label: 'Pending Reviews', value: 4, trend: '0', trendDir: 'up', color: 'blue', icon: 'ClipboardCheck' }
  ];

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <motion.div className="page-header" variants={headerVariants}>
        <div>
          <h1><span className="gradient-text">Safety Officer Dashboard</span></h1>
          <p>Risk and compliance monitoring</p>
        </div>
        <div className="page-actions">
          <motion.button className="btn btn-secondary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <CheckCircle size={14} /> Audit Compliance
          </motion.button>
          <motion.button className="btn btn-primary btn-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <FileText size={14} /> Safety Report
          </motion.button>
        </div>
      </motion.div>

      <motion.div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }} variants={itemVariants}>
        {liveSafetyKPIs.map((kpi, i) => (
          <KPICard key={kpi.label} {...kpi} delay={i * 80} />
        ))}
      </motion.div>

      <motion.div className="dashboard-grid" variants={containerVariants}>
        {/* Compliance Trend */}
        <motion.div className="col-8" variants={itemVariants}>
          <ChartCard title="Compliance Score Trend" subtitle="Monthly compliance performance">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={complianceTrendData}>
                <defs>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-500)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                <Line type="monotone" dataKey="score" stroke="var(--color-accent-500)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-accent-500)', strokeWidth: 0 }} name="Score %" activeDot={{ r: 6, stroke: 'var(--color-accent-300)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="violations" stroke="var(--color-danger)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Violations" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>

        {/* Incident Severity */}
        <motion.div className="col-4" variants={itemVariants}>
          <ChartCard title="Incident Severity" subtitle={hasIncidentData ? "Distribution by severity level" : "No active incidents (showing scale)"}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {liveIncidentSeverityData.map(item => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}40` }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </ChartCard>
        </motion.div>

        {/* Active Violations */}
        <motion.div className="col-12" variants={itemVariants}>
          <ChartCard title="Active Violations" subtitle="Compliance rule breaches requiring attention">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Rule</th>
                    <th>Asset</th>
                    <th>Value</th>
                    <th>Threshold</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Detected</th>
                  </tr>
                </thead>
                <tbody style={{ position: 'relative' }}>
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                        No active compliance violations recorded
                      </td>
                    </tr>
                  ) : (
                    violations.map((v, i) => (
                      <motion.tr
                        key={v._id}
                        variants={rowVariants}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                      >
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{v._id?.substring(18) || v._id}</td>
                        <td style={{ fontWeight: 'var(--font-medium)' }}>{v.ruleId?.ruleCode || '—'}</td>
                        <td>{v.nodeId?.nodeName || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)', fontWeight: 'var(--font-semibold)', textShadow: '0 0 8px rgba(220,38,38,0.2)' }}>{v.actualValue}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{v.expectedValue}</td>
                        <td><StatusBadge status={v.severity} dot /></td>
                        <td><StatusBadge status={v.status} /></td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{timeAgo(v.createdAt)}</td>
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

