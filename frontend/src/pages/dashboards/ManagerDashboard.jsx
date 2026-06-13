import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import KPICard from '../../components/common/KPICard';
import ChartCard from '../../components/common/ChartCard';
import { riskTrendData, complianceTrendData } from '../../data/mockData';
import { complianceService } from '../../utils/complianceService';
import { Download } from 'lucide-react';
import { downloadReport } from '../../utils/reportService';


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

const businessImpact = [
  { metric: 'Downtime Prevention', value: '47.2 hrs', change: '+8.3h', positive: true },
  { metric: 'Cost Savings', value: '₹4.2 Cr', change: '+₹0.8Cr', positive: true },
  { metric: 'Incident Reduction', value: '34%', change: '+12%', positive: true },
  { metric: 'MTTR Improvement', value: '2.1 hrs', change: '-0.8h', positive: true },
  { metric: 'Safety Score', value: '94.2%', change: '-1.8%', positive: false },
  { metric: 'Network Uptime', value: '99.97%', change: '+0.02%', positive: true },
];

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadReport('infrastructure', 'pdf', 'Infrastructure Report');
    } catch (err) {
      alert('Failed to export report: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchManagerData = async () => {
      try {
        const res = await complianceService.getDashboardStats();
        if (res.success) {
          setStats(res.stats);
        }
      } catch (err) {
        console.error('[MANAGER-DASHBOARD] Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchManagerData();
  }, []);

  const totalOpenViolations = stats ? (stats.violations.open + stats.violations.investigating) : 0;
  const complianceScore = stats
    ? (stats.violations.open > 0 ? (100 - stats.violations.open * 12.5).toFixed(1) + '%' : '100.0%')
    : '100.0%';

  const liveManagerKPIs = [
    { label: 'Infra Health', value: '91.3%', trend: '+0.7%', trendDir: 'up', color: 'green', icon: 'Heart' },
    { label: 'Network Availability', value: '98.5%', trend: '-0.5%', trendDir: 'down', color: 'teal', icon: 'Wifi' },
    { label: 'Downtime Prevented', value: '47.2h', trend: '+8.3h', trendDir: 'up', color: 'blue', icon: 'Clock' },
    { label: 'Predicted Failures', value: 12, trend: '+3', trendDir: 'down', color: 'amber', icon: 'TrendingUp' },
    { label: 'Compliance Score', value: complianceScore, trend: stats?.violations.open > 0 ? '-1.8%' : '+0.5%', trendDir: stats?.violations.open > 0 ? 'down' : 'up', color: totalOpenViolations > 0 ? 'amber' : 'green', icon: 'Shield' },
    { label: 'Cost Savings', value: '₹4.2Cr', trend: '+₹0.8Cr', trendDir: 'up', color: 'green', icon: 'IndianRupee' },
    { label: 'Auto Actions', value: 156, trend: '+23', trendDir: 'up', color: 'teal', icon: 'Bot' }
  ];

  const liveComplianceTrendData = complianceTrendData.map(item => {
    if (item.month === 'Jun') {
      return {
        ...item,
        score: stats ? Math.round(stats.violations.open > 0 ? (100 - stats.violations.open * 12.5) : 100) : item.score,
        violations: stats ? stats.violations.total : item.violations
      };
    }
    return item;
  });

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      <motion.div className="page-header" variants={headerVariants}>
        <div>
          <h1><span className="gradient-text">Manager Dashboard</span></h1>
          <p>Executive overview and strategic insights</p>
        </div>
        <div className="page-actions">
          <motion.button
            className="btn btn-primary btn-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={exporting}
          >
            <Download size={14} /> {exporting ? 'Exporting...' : 'Export Reports'}
          </motion.button>
        </div>
      </motion.div>

      <motion.div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} variants={itemVariants}>
        {liveManagerKPIs.slice(0, 4).map((kpi, i) => (
          <KPICard key={kpi.label} {...kpi} delay={i * 80} />
        ))}
      </motion.div>
      <motion.div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '-0.5rem' }} variants={itemVariants}>
        {liveManagerKPIs.slice(4).map((kpi, i) => (
          <KPICard key={kpi.label} {...kpi} delay={(i + 4) * 80} />
        ))}
      </motion.div>

      <motion.div className="dashboard-grid" variants={containerVariants}>
        {/* Performance Trends */}
        <motion.div className="col-8" variants={itemVariants}>
          <ChartCard title="Performance Trends" subtitle="Risk score and mitigation actions over 30 days">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={riskTrendData}>
                <defs>
                  <linearGradient id="mgrRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-400)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mgrMit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                <Area type="monotone" dataKey="risk" stroke="var(--color-accent-400)" fill="url(#mgrRisk)" strokeWidth={2.5} name="Risk Score" />
                <Area type="monotone" dataKey="mitigations" stroke="var(--color-primary-400)" fill="url(#mgrMit)" strokeWidth={1.5} name="Mitigations" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>

        {/* Business Impact */}
        <motion.div className="col-4" variants={itemVariants}>
          <ChartCard title="Business Impact" subtitle="Key performance metrics">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {businessImpact.map((item, i) => (
                <motion.div
                  key={item.metric}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.metric}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)' }}>{item.value}</span>
                    <span className={`kpi-trend ${item.positive ? 'up' : 'down'}`} style={{ fontSize: '10px' }}>
                      {item.change}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </motion.div>

        {/* Compliance Overview */}
        <motion.div className="col-12" variants={itemVariants}>
          <ChartCard title="Compliance Overview" subtitle="Monthly compliance scores and violation counts">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={liveComplianceTrendData}>
                <defs>
                  <linearGradient id="compBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                <Bar dataKey="score" fill="url(#compBar)" radius={[6, 6, 0, 0]} name="Score" />
                <Bar dataKey="violations" fill="var(--color-warning)" radius={[6, 6, 0, 0]} name="Violations" opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

