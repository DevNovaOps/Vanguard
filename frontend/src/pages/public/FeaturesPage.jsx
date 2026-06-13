import { Radio, AlertTriangle, Shield, Bot, Map, BarChart3, Database, Wrench, FileText, Webhook } from 'lucide-react';

const MODULES = [
  { icon: Radio, title: 'Telemetry Center', desc: 'Live sensor monitoring with temperature, vibration, gas, pressure, and power consumption streams. Historical trends and anomaly detection.', color: 'var(--color-primary-500)' },
  { icon: Database, title: 'Infrastructure Database', desc: 'Complete asset management for stations, junctions, depots, power hubs, and signal systems. Maintenance history tracking and relationship mapping.', color: 'var(--color-accent-500)' },
  { icon: AlertTriangle, title: 'Risk Analysis Engine', desc: 'Real-time risk scoring, failure prediction, threat matrices, and heatmap visualization. AI-powered predictive analytics for proactive maintenance.', color: 'var(--color-warning)' },
  { icon: Shield, title: 'Compliance Center', desc: 'Automated compliance validation against API617, RDSO, IEC, and UIC standards. Rule management, violation tracking, and authority reference integration.', color: 'var(--color-success)' },
  { icon: Bot, title: 'Autonomous Agent', desc: 'Self-operating AI decision engine with 7-stage pipeline: Telemetry → Compliance → Risk → Heap → Incident → Decision → Mitigation.', color: 'var(--color-danger)' },
  { icon: Wrench, title: 'Mitigation Center', desc: 'Automated mitigation actions including emergency braking, route isolation, power rerouting, maintenance alerts, and operator notifications.', color: '#7C3AED' },
  { icon: Map, title: 'Railway Network', desc: 'Interactive SVG-based railway map with stations, junctions, depots, routes, and live status indicators. Zoom, pan, and node detail views.', color: '#2563EB' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Auto-generated infrastructure, compliance, incident, risk, and autonomous action reports. Export to PDF, CSV, and Excel formats.', color: 'var(--color-accent-500)' },
  { icon: FileText, title: 'Audit Logs', desc: 'Complete audit trail of all system actions, user activities, and autonomous decisions. Searchable, filterable, and exportable.', color: 'var(--text-secondary)' },
  { icon: Webhook, title: 'Webhook Center', desc: 'Real-time event streaming via webhooks. Monitor delivery status, latency, and success rates for all integrated systems.', color: 'var(--color-info)' },
];

export default function FeaturesPage() {
  return (
    <div className="info-page" style={{ maxWidth: '1100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1><span className="gradient-text">Platform Features</span></h1>
        <p style={{ maxWidth: '600px', margin: '0 auto' }}>
          Vanguard ARC provides 10 integrated modules for complete railway infrastructure intelligence and autonomous risk mitigation.
        </p>
      </div>
      <div className="landing-feature-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {MODULES.map((m, i) => (
          <div key={m.title} className={`landing-feature-card animate-slide-up stagger-${(i % 8) + 1}`}>
            <div className="landing-feature-icon" style={{ background: `${m.color}15`, color: m.color }}>
              <m.icon size={24} />
            </div>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
