import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import ChartCard from '../../components/common/ChartCard';
import StatusBadge from '../../components/common/StatusBadge';
import { transitNodes, riskTrendData } from '../../data/mockData';
import { AlertTriangle } from 'lucide-react';

const topRiskAssets = [...transitNodes].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);

const threatMatrix = [
  { category: 'Thermal', likelihood: 'High', impact: 'Critical', assets: 3 },
  { category: 'Electrical', likelihood: 'Medium', impact: 'High', assets: 2 },
  { category: 'Structural', likelihood: 'Low', impact: 'High', assets: 1 },
  { category: 'Signal', likelihood: 'Medium', impact: 'Critical', assets: 2 },
  { category: 'Mechanical', likelihood: 'Low', impact: 'Medium', assets: 1 },
];

export default function RiskAnalysis() {
  const overallRisk = Math.max(...transitNodes.map(n => n.riskScore));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><AlertTriangle size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Risk Analysis Engine</h1>
          <p>AI-powered risk assessment and failure prediction</p>
        </div>
      </div>

      {/* Current Risk Score */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="col-4">
          <div className="card animate-slide-up" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'var(--font-semibold)' }}>Current Risk Score</div>
            <div style={{
              fontSize: '4rem', fontWeight: 'var(--font-bold)', letterSpacing: '-0.04em',
              color: overallRisk >= 70 ? 'var(--color-danger)' : overallRisk >= 40 ? 'var(--color-warning)' : 'var(--color-success)',
              lineHeight: 1
            }}>{overallRisk}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>out of 100</div>
            <div style={{ marginTop: '1rem' }}>
              <div className="progress-bar" style={{ height: '8px' }}>
                <div className="progress-fill danger" style={{ width: `${overallRisk}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-8">
          <ChartCard title="Risk Score Trend" subtitle="30-day risk trajectory">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={riskTrendData}>
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
              {transitNodes.map(node => (
                <div
                  key={node.id}
                  className={`heatmap-cell ${node.riskScore >= 70 ? 'critical' : node.riskScore >= 40 ? 'medium' : 'low'}`}
                >
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>{node.name.split(' ').slice(0, 2).join(' ')}</div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginTop: '2px' }}>{node.riskScore}</div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Top Risk Assets */}
        <div className="col-6">
          <ChartCard title="Top Risk Assets" subtitle="Highest risk scores">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topRiskAssets.map((node, i) => (
                <div key={node.id} className="animate-slide-up" style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                  animationDelay: `${i * 50}ms`
                }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', minWidth: '20px' }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{node.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{node.id} · {node.zone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 'var(--text-md)', fontWeight: 'var(--font-bold)',
                      color: node.riskScore >= 70 ? 'var(--color-danger)' : node.riskScore >= 40 ? 'var(--color-warning)' : 'var(--color-success)'
                    }}>{node.riskScore}</div>
                  </div>
                  <StatusBadge status={node.status} />
                </div>
              ))}
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
                          <div className={`progress-fill ${t.impact === 'Critical' ? 'danger' : t.impact === 'High' ? 'warning' : ''}`} style={{ width: `${t.assets * 30}%` }} />
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
