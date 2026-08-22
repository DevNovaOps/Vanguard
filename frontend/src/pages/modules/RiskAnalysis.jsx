import { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FormattedMarkdown from '../../components/common/FormattedMarkdown';
import { AlertTriangle, RefreshCw, Zap, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { riskService } from '../../utils/riskService';
import { api } from '../../utils/api';
import { useSimulation } from '../../contexts/SimulationContext';

export default function RiskAnalysis() {
  const { user } = useAuth();
  const { simulationStore } = useSimulation();
  const [risks, setRisks] = useState([]);
  const [simulationHistory, setSimulationHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  // Recalculation privilege check
  const userRoleNorm = (user?.role || '').toLowerCase().replace(/_/g, '');
  const isAuthorizedToCalculate = user && (userRoleNorm === 'admin' || userRoleNorm === 'safetyofficer');

  // Fetch data
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [risksRes, statsRes, simHistRes] = await Promise.allSettled([
        riskService.getRisks(),
        riskService.getDashboardStats(),
        api.get('/api/simulation/history')
      ]);

      if (risksRes.status === 'fulfilled' && risksRes.value?.success) {
        setRisks(risksRes.value.risks || []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.stats);
      }
      if (simHistRes.status === 'fulfilled' && simHistRes.value?.data) {
        setSimulationHistory(simHistRes.value.data || []);
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

  // Build simulation assets list strictly from active simulation store and simulation history
  const simulationAssets = useMemo(() => {
    let list = [];

    if (simulationStore) {
      const simNodeName = simulationStore?.targetNode?.nodeName || simulationStore?.affected_assets?.[0]?.location || 'Active Simulation Target';
      const simNodeCode = simulationStore?.targetNode?.nodeCode || simulationStore?.affected_assets?.[0]?.asset_id || 'SIM-LIVE';
      const simRegion = simulationStore?.targetNode?.region || 'Central';
      const simRiskScore = simulationStore?.calculatedRiskScore || 95;
      const simRiskLevel = simulationStore?.risk_level || 'Critical';

      list.push({
        _id: 'live-sim-target',
        nodeId: {
          nodeName: simNodeName,
          nodeCode: simNodeCode,
          region: simRegion,
          status: 'critical'
        },
        thermalRisk: Math.min(100, simRiskScore + 5),
        electricalRisk: simRiskScore,
        structuralRisk: simRiskScore - 5,
        mechanicalRisk: simRiskScore - 10,
        signalingRisk: simRiskScore,
        totalRisk: simRiskScore,
        riskLevel: simRiskLevel,
        isLive: true
      });
    }

    if (simulationHistory.length > 0) {
      simulationHistory.forEach((run) => {
        const nodeInfo = run.nodeId;
        const nodeName = typeof nodeInfo === 'object' && nodeInfo?.nodeName ? nodeInfo.nodeName : (nodeInfo ? `Station #${nodeInfo}` : 'Simulated Target Node');
        const nodeCode = typeof nodeInfo === 'object' && nodeInfo?.nodeCode ? nodeInfo.nodeCode : (nodeInfo ? `ND-${nodeInfo}` : run.runId);
        const region = typeof nodeInfo === 'object' && nodeInfo?.region ? nodeInfo.region : 'Network';
        const score = run.result?.riskScore || 85;
        const level = score >= 80 ? 'Critical' : (score >= 60 ? 'High' : 'Medium');

        if (!list.some(a => a.nodeId?.nodeCode === nodeCode)) {
          list.push({
            _id: run._id || run.runId,
            nodeId: {
              nodeName,
              nodeCode,
              region,
              status: run.status === 'Completed' ? 'warning' : 'critical'
            },
            thermalRisk: score,
            electricalRisk: Math.max(10, score - 10),
            structuralRisk: Math.max(10, score - 15),
            mechanicalRisk: Math.max(10, score - 20),
            signalingRisk: score,
            totalRisk: score,
            riskLevel: level,
            runId: run.runId,
            createdAt: run.createdAt || run.startedAt
          });
        }
      });
    }

    return list.sort((a, b) => b.totalRisk - a.totalRisk);
  }, [simulationStore, simulationHistory]);

  // Overall risk score (displays simulation risk score)
  const overallRisk = simulationStore?.calculatedRiskScore || (simulationAssets.length > 0 ? simulationAssets[0].totalRisk : (stats?.highestRiskNode?.totalRisk || 0));

  // Top Risk Assets and Heatmap Assets (strictly simulation data)
  const displayAssets = simulationAssets;

  // Trend data strictly built from simulation history runs
  const trendData = useMemo(() => {
    if (simulationHistory.length > 0) {
      const sorted = [...simulationHistory].reverse();
      return sorted.map((run, i) => {
        const score = run.result?.riskScore || 85;
        const timeLabel = run.createdAt ? new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `Run #${i + 1}`;
        return {
          day: timeLabel,
          risk: score,
          name: run.runId
        };
      });
    }

    if (simulationStore) {
      return [
        { day: 'Start', risk: 40 },
        { day: 'Sim Triggered', risk: 80 },
        { day: 'Active Peak', risk: simulationStore.calculatedRiskScore || 95 }
      ];
    }

    return [];
  }, [simulationHistory, simulationStore]);

  // Dynamically compute threat category fields
  const categories = [
    { label: 'Thermal', field: 'thermalRisk' },
    { label: 'Electrical', field: 'electricalRisk' },
    { label: 'Structural', field: 'structuralRisk' },
    { label: 'Signal', field: 'signalingRisk' },
    { label: 'Mechanical', field: 'mechanicalRisk' }
  ];

  const threatMatrix = categories.map(cat => {
    const targetRisks = displayAssets.length > 0 ? displayAssets : risks;
    const scores = targetRisks.map(r => r[cat.field] || 0);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const max = scores.length ? Math.max(...scores) : 0;
    const assetsCount = targetRisks.filter(r => (r[cat.field] || 0) >= 40).length;

    let likelihood = 'Low';
    if (avg >= 40 || simulationStore) likelihood = 'High';
    else if (avg >= 20) likelihood = 'Medium';

    let impact = 'Low';
    if (max >= 80 || simulationStore) impact = 'Critical';
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

      {simulationStore && (
        <div className="card animate-slide-up" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-danger)', background: 'rgba(220, 38, 38, 0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: 'var(--text-md)', fontWeight: 700 }}>
              <AlertTriangle size={20} /> ACTIVE SIMULATED THREAT — {simulationStore?.targetNode?.nodeName || simulationStore?.affected_assets?.[0]?.location || 'Active Simulation Target'} ({simulationStore?.targetNode?.nodeCode || simulationStore?.affected_assets?.[0]?.asset_id || 'SIM-LIVE'})
            </h3>
            <span className="badge badge-danger" style={{ fontSize: '12px', padding: '4px 10px' }}>
              SIMULATED RISK: {simulationStore.calculatedRiskScore || 95}/100 ({simulationStore.risk_level || 'CRITICAL'})
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)', maxHeight: '380px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#60a5fa', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Executive Summary</span>
              </div>
              <FormattedMarkdown
                text={simulationStore.executive_summary || 'Multi-agent failure simulation executed for target node.\n- Thermal and vibration anomalies isolated.\n- Emergency Speed Restriction (30 km/h) & Coolant Flush triggered.'}
                accentColor="#60a5fa"
              />
            </div>

            <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)', maxHeight: '380px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#34d399', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>AI Corrective Mitigations</span>
              </div>
              <FormattedMarkdown
                text={simulationStore.mitigation_actions || '1. Speed restriction (30 km/h) applied.\n2. Maintenance crew dispatched.\n3. Automatic power rerouting initialized.'}
                accentColor="#34d399"
              />
            </div>
          </div>
        </div>
      )}

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
          <ChartCard title="Risk Score Trend" subtitle="Simulation runs risk trajectory">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--chart-text)' }} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px' }} />
                <Line type="monotone" dataKey="risk" stroke="var(--color-danger)" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Risk Heatmap */}
        <div className="col-6">
          <ChartCard title="Risk Heatmap" subtitle="Simulation asset risk distribution">
            <div style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
            <div className="risk-heatmap">
              {displayAssets.length === 0 ? (
                <div style={{ gridColumn: 'span 4', color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                  No active simulation threats or past runs found.
                </div>
              ) : (
                displayAssets.map(risk => (
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
            </div>
          </ChartCard>
        </div>

        {/* Top Risk Assets */}
        <div className="col-6">
          <ChartCard title="Top Risk Assets" subtitle="Simulation target risk scores">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {displayAssets.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                  No simulation assets evaluated yet. Trigger a simulation to display risk targets.
                </div>
              ) : (
                displayAssets.map((risk, i) => (
                  <div key={risk._id} className="animate-slide-up" style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                    border: risk.isLive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-secondary)',
                    animationDelay: `${i * 50}ms`
                  }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', minWidth: '20px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {risk.nodeId?.nodeName || 'Unknown'}
                        {risk.isLive && <span className="badge badge-danger" style={{ fontSize: '10px', padding: '1px 5px' }}>ACTIVE SIM</span>}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{risk.nodeId?.nodeCode || 'N/A'} · {risk.nodeId?.region || 'N/A'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)',
                        color: risk.totalRisk >= 60 ? 'var(--color-danger)' : risk.totalRisk >= 30 ? 'var(--color-warning)' : 'var(--color-success)'
                      }}>{risk.totalRisk}</div>
                    </div>
                    <StatusBadge status={risk.nodeId?.status || 'critical'} />
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
