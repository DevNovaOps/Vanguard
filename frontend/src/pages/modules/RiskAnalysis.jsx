import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { riskTrendData } from '../../data/mockData';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { riskService } from '../../utils/riskService';

export default function RiskAnalysis() {
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  // Recalculation privilege check
  const isAuthorizedToCalculate = user && (user.role === 'admin' || user.role === 'safety_officer');

  // Fetch all risk data from live APIs
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [risksRes, statsRes] = await Promise.all([
        riskService.getRisks(),
        riskService.getDashboardStats()
      ]);
      if (risksRes.success) {
        setRisks(risksRes.risks || []);
      }
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      if (!isSilent) {
        setError(err.message || 'Failed to fetch risk analysis data');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData(false);

    // Auto-polling every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Recalculate risk scores
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await riskService.calculateRisks();
      if (res.success) {
        await fetchData(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to trigger risk recalculation');
    } finally {
      setRecalculating(false);
    }
  };

  // Derive highest risk score and top risk assets
  const overallRisk = stats?.highestRiskNode?.totalRisk || 0;
  const topRiskAssets = [...risks].sort((a, b) => b.totalRisk - a.totalRisk).slice(0, 8);

  // Scaled trend chart to align the end of 30-day mock trend with live metrics
  const adjustedTrendData = riskTrendData.map((d, i) => {
    if (i === riskTrendData.length - 1) {
      return { ...d, risk: stats?.averageRisk || d.risk };
    }
    return d;
  });

  // Dynamically compute threat matrix category fields
  const categories = [
    { label: 'Thermal', field: 'thermalRisk' },
    { label: 'Electrical', field: 'electricalRisk' },
    { label: 'Structural', field: 'structuralRisk' },
    { label: 'Signal', field: 'signalingRisk' },
    { label: 'Mechanical', field: 'mechanicalRisk' }
  ];

  const threatMatrix = categories.map(cat => {
    const scores = risks.map(r => r[cat.field] || 0);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const max = scores.length ? Math.max(...scores) : 0;
    const assetsCount = risks.filter(r => (r[cat.field] || 0) >= 40).length;

    let likelihood = 'Low';
    if (avg >= 40) likelihood = 'High';
    else if (avg >= 20) likelihood = 'Medium';

    let impact = 'Low';
    if (max >= 80) impact = 'Critical';
    else if (max >= 60) impact = 'High';
    else if (max >= 30) impact = 'Medium';

    return {
      category: cat.label,
      likelihood,
      impact,
      assets: assetsCount
    };
  });

  if (loading && risks.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && risks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 1rem' }} />
        <h3>Error Loading Risk Data</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => fetchData(false)}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><AlertTriangle size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Risk Analysis Engine</span></h1>
          <p>AI-powered risk assessment and failure prediction</p>
        </div>
        {isAuthorizedToCalculate && (
          <div className="page-actions">
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleRecalculate} 
              disabled={recalculating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Recalculating...' : 'Recalculate Risks'}
            </button>
          </div>
        )}
      </div>

      {/* Current Risk Score */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="col-4">
          <div className="card animate-slide-up" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--font-semibold)' }}>Current Risk Score</div>
            <div style={{
              fontSize: '4rem', fontWeight: 'var(--font-bold)', letterSpacing: '-0.04em',
              color: overallRisk >= 80 ? 'var(--color-danger)' : overallRisk >= 60 ? 'var(--color-danger)' : overallRisk >= 30 ? 'var(--color-warning)' : 'var(--color-success)',
              lineHeight: 1
            }}>{overallRisk}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>out of 100</div>
            <div style={{ marginTop: '1rem' }}>
              <div className="progress-bar" style={{ height: '8px' }}>
                <div className={`progress-fill ${overallRisk >= 60 ? 'danger' : overallRisk >= 30 ? 'warning' : 'success'}`} style={{ width: `${overallRisk}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-8">
          <ChartCard title="Risk Score Trend" subtitle="30-day risk trajectory">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={adjustedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="risk" stroke="var(--color-danger)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Risk Heatmap */}
        <div className="col-6">
          <ChartCard title="Risk Heatmap" subtitle="Asset risk distribution">
            <div className="risk-heatmap">
              {risks.length === 0 ? (
                <div style={{ gridColumn: 'span 4', color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                  No nodes loaded.
                </div>
              ) : (
                risks.map(risk => (
                  <div
                    key={risk._id}
                    className={`heatmap-cell ${(risk.riskLevel || 'Low').toLowerCase()}`}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>{(risk.nodeId?.nodeName || 'Unknown').split(' ').slice(0, 2).join(' ')}</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginTop: '2px' }}>{risk.totalRisk}</div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </div>

        {/* Top Risk Assets */}
        <div className="col-6">
          <ChartCard title="Top Risk Assets" subtitle="Highest risk scores">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topRiskAssets.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                  No assets with risk scores found.
                </div>
              ) : (
                topRiskAssets.map((risk, i) => (
                  <div key={risk._id} className="animate-slide-up" style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                    animationDelay: `${i * 50}ms`
                  }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', minWidth: '20px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{risk.nodeId?.nodeName || 'Unknown'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{risk.nodeId?.nodeCode || 'N/A'} · {risk.nodeId?.region || 'N/A'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)',
                        color: risk.totalRisk >= 60 ? 'var(--color-danger)' : risk.totalRisk >= 30 ? 'var(--color-warning)' : 'var(--color-success)'
                      }}>{risk.totalRisk}</div>
                    </div>
                    <StatusBadge status={risk.nodeId?.status} />
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </div>

        {/* Threat Matrix */}
        <div className="col-12">
          <ChartCard title="Threat Matrix" subtitle="Risk categorization by type">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Likelihood</th>
                    <th>Impact</th>
                    <th>Affected Assets</th>
                    <th>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {threatMatrix.map(t => (
                    <tr key={t.category}>
                      <td style={{ fontWeight: 'var(--font-medium)' }}>{t.category}</td>
                      <td><StatusBadge status={t.likelihood} /></td>
                      <td><StatusBadge status={t.impact} /></td>
                      <td>{t.assets}</td>
                      <td>
                        <div className="progress-bar" style={{ width: 80, height: 6 }}>
                          <div className={`progress-fill ${t.impact === 'Critical' ? 'danger' : t.impact === 'High' ? 'warning' : ''}`} style={{ width: `${Math.min(100, t.assets * 30)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
