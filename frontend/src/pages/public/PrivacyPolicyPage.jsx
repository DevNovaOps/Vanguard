import { Shield, Eye, Lock, RefreshCw } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="info-page">
      <h1><span className="gradient-text">Privacy Policy</span></h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginBottom: '1.5rem' }}>Last Updated: June 13, 2026</p>
      
      <p>
        At Vanguard ARC, we prioritize the protection of all industrial transit data, system metrics, and personal user credentials.
        This Privacy Policy outlines how our autonomous railway infrastructure monitoring platform collects, processes, and safeguards data.
      </p>

      <h2>1. Information We Collect</h2>
      <p>
        The platform collects the following types of information to ensure operational safety and compliance:
      </p>
      <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <li><strong>User Credentials & Profiles:</strong> Names, work emails, and role categories (Admin, Operator, Safety Officer, Manager) to enforce Role-Based Access Control (RBAC).</li>
        <li><strong>Industrial Telemetry:</strong> Real-time sensor metrics (temperature, vibration, pressure, gas levels, speed) streamed from active railway infrastructure assets.</li>
        <li><strong>System Audit Trails:</strong> Comprehensive logs of user login activity, configuration changes, and autonomous agent decisions.</li>
      </ul>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
        {[
          { icon: Lock, title: 'Secure Storage', desc: 'All credentials and telemetry are stored with industry-standard AES-256 encryption.' },
          { icon: Eye, title: 'Data Isolation', desc: 'Strict data boundaries exist between operational sectors and zones.' },
          { icon: Shield, title: 'Compliance Checked', desc: 'Data handling complies with IEC-62443 industrial cybersecurity standards.' },
          { icon: RefreshCw, title: 'Access Logs', desc: 'Every data access event is logged permanently in the system audit trail.' },
        ].map(item => (
          <div key={item.title} className="card animate-slide-up" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', background: 'var(--bg-active)', marginBottom: '12px' }}>
              <item.icon size={24} color="var(--color-primary-500)" />
            </div>
            <h4 style={{ marginBottom: '0.5rem' }}>{item.title}</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <h2>2. Processing of Operational Metrics</h2>
      <p>
        Telemetry data is processed in real time by the Vanguard ARC Autonomous Agent. This processing is restricted to detecting compliance breaches, calculating asset risk levels, and executing pre-approved mitigation actions (e.g., speed reductions or warning triggers).
      </p>

      <h2>3. Information Sharing & Security</h2>
      <p>
        Vanguard ARC does not rent, sell, or share operational datasets with third parties. Data is only accessible to authorized railway personnel. All data transfer is encrypted using TLS 1.3 to prevent intercept threat vectors.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        System logs and telemetry data are retained according to National Railway Regulatory frameworks. Active session tokens are automatically cleared upon logout or session timeout.
      </p>
    </div>
  );
}
