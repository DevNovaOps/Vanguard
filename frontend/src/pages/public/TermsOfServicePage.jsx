import { Shield, FileText, CheckCircle, Scale } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="info-page">
      <h1><span className="gradient-text">Terms of Service</span></h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginBottom: '1.5rem' }}>Last Updated: June 13, 2026</p>

      <p>
        Welcome to Vanguard ARC (Autonomous Railway Control). These Terms of Service ("Terms") govern your deployment and access
        to the Vanguard ARC platform, including all associated telemetry, compliance validation engines, and risk scoring portals.
      </p>

      <h2>1. Acceptable Operational Use</h2>
      <p>
        Vanguard ARC is designed specifically for railway infrastructure management, transit monitoring, and safety operations.
        Authorized users must strictly adhere to their assigned role guidelines (Admin, Operator, Safety Officer, Manager) and avoid:
      </p>
      <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <li>Attempting to bypass the Role-Based Access Control (RBAC) layers or accessing restricted administrative logs.</li>
        <li>Injecting simulated sensor values or triggering failure simulations on live production lines without operational approval.</li>
        <li>Bypassing auto-generated incident mitigations unless specifically mandated by safety directives.</li>
      </ul>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
        {[
          { icon: Scale, title: 'Regulatory Compliance', desc: 'Operations must comply with RDSO, API617, and local transit directives.' },
          { icon: FileText, title: 'Audit Reporting', desc: 'All user actions are logged permanently for compliance checks.' },
          { icon: Shield, title: 'Safety Overrides', desc: 'Mitigation actions must only be overridden by certified personnel.' },
          { icon: CheckCircle, title: 'SLA Standards', desc: 'System availability matches premium 99.97% uptime commitments.' },
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

      <h2>2. Intellectual Property Rights</h2>
      <p>
        The software, real-time visualization frameworks, proprietary risk scoring logic, and autonomous agent pipelines remain the exclusive intellectual property of Vanguard ARC and its technology providers.
      </p>

      <h2>3. Disclaimer of Liability</h2>
      <p>
        While Vanguard ARC's predictive intelligence has a 97%+ accuracy rate, system warnings and automated suggestions must be evaluated in conjunction with manual safety protocols and visual track surveys.
      </p>

      <h2>4. Platform Access Termination</h2>
      <p>
        Failure to resolve compliance violations or repeated unauthorized actions on the platform will result in immediate suspension or termination of user access.
      </p>
    </div>
  );
}
