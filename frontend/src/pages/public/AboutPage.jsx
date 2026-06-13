import { Shield, Users, Target, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="info-page">
      <h1><span className="gradient-text">About Vanguard ARC</span></h1>
      <p>
        Vanguard ARC (Autonomous Railway Control) is an enterprise-grade AI-powered platform
        designed for mission-critical railway infrastructure monitoring, risk analysis,
        and autonomous mitigation.
      </p>

      <h2>Our Mission</h2>
      <p>
        To revolutionize railway safety and operational excellence through intelligent automation,
        real-time telemetry processing, and AI-driven decision making — ensuring millions of
        passengers travel safely every day.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
        {[
          { icon: Shield, title: 'Safety First', desc: 'Every decision prioritizes passenger and infrastructure safety above all else.' },
          { icon: Users, title: 'Trusted by Railways', desc: 'Designed for Indian Railways, Siemens Mobility, Alstom, and Hitachi Rail standards.' },
          { icon: Target, title: 'Precision Analytics', desc: 'AI-powered risk scoring with 97%+ prediction accuracy across 284+ sensors.' },
          { icon: Award, title: 'Compliance Ready', desc: 'Pre-configured for API617, RDSO, IEC-61850, UIC, and EN-50126 standards.' },
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

      <h2>Technical Architecture</h2>
      <p>
        Built on modern web technologies with React, real-time WebSocket communication,
        Max Heap data structures for incident prioritization, and a comprehensive compliance
        engine. The platform processes thousands of telemetry events per second while maintaining
        99.97% uptime across distributed railway networks.
      </p>

      <h2>Key Differentiators</h2>
      <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>Autonomous AI agent with 7-stage decision pipeline</li>
        <li>Max Heap-based incident prioritization (DSA showcase)</li>
        <li>Real-time compliance validation against 8+ standards</li>
        <li>Interactive railway network visualization with live status</li>
        <li>Role-based access control with 4 specialized dashboards</li>
        <li>One-click failure simulation for live demonstrations</li>
      </ul>
    </div>
  );
}
