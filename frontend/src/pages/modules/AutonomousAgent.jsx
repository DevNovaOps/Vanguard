import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../components/common/StatusBadge';
import ChartCard from '../../components/common/ChartCard';
import { useSimulation } from '../../contexts/SimulationContext';
import { agentDecisions, mitigationActions, incidents } from '../../data/mockData';
import { timeAgo } from '../../utils/helpers';
import { Bot, Radio, AlertTriangle, Shield, Wrench, Play, Zap, Brain, Target, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';

const PIPELINE_STEPS = [
  { label: 'Ingest', icon: Radio, description: 'Sensor telemetry' },
  { label: 'Detect', icon: AlertTriangle, description: 'Threat analysis' },
  { label: 'Classify', icon: Brain, description: 'Risk scoring' },
  { label: 'Validate', icon: Shield, description: 'Compliance check' },
  { label: 'Act', icon: Target, description: 'Generate mitigation' },
  { label: 'Execute', icon: Zap, description: 'Deploy action' },
];

const AI_LINES = [
  { text: '▸ Initializing ARC Intelligence Engine v2.4.1...', type: 'muted' },
  { text: '▸ Connecting to 284 active sensors across network...', type: 'info' },
  { text: '▸ Telemetry stream active — 1.2M data points/hour', type: 'success' },
  { text: '', type: '' },
  { text: '⚠ ANOMALY: Transformer temperature 78.4°C at TN-011', type: 'warning' },
  { text: '⚠ ANOMALY: Grid output 18.2kV (below 22kV threshold)', type: 'warning' },
  { text: '✗ VIOLATION: API617-TEMP — Bhusawal Power Hub', type: 'danger' },
  { text: '✗ VIOLATION: RDSO-SPEC — OHE voltage out of range', type: 'danger' },
  { text: '', type: '' },
  { text: '▸ Risk score calculated: 82/100 — CRITICAL', type: 'danger' },
  { text: '▸ Max Heap priority: Rank 1 of 8 active incidents', type: 'info' },
  { text: '▸ Generating mitigation strategy...', type: 'info' },
  { text: '', type: '' },
  { text: '✓ Decision: Emergency Speed Restriction', type: 'success' },
  { text: '  Confidence: 97.2% | Execution: 1.2s', type: 'success' },
  { text: '✓ Decision: Power Rerouting via Jhansi Hub', type: 'success' },
  { text: '  Confidence: 94.8% | Execution: 2.4s', type: 'success' },
  { text: '', type: '' },
  { text: '▸ All mitigations deployed. Monitoring recovery...', type: 'info' },
];

export default function AutonomousAgent() {
  const { isRunning, currentStep, events, totalSteps } = useSimulation();
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [terminalLines, setTerminalLines] = useState([]);
  const [showCursor, setShowCursor] = useState(true);
  const terminalRef = useRef(null);

  // Animate pipeline steps
  useEffect(() => {
    if (!isRunning && activeStepIndex < 0) {
      const interval = setInterval(() => {
        setActiveStepIndex(prev => (prev + 1) % PIPELINE_STEPS.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isRunning, activeStepIndex]);

  // Animate terminal typing
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < AI_LINES.length) {
        setTerminalLines(prev => [...prev, AI_LINES[idx]]);
        idx++;
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      } else {
        // Loop
        idx = 0;
        setTerminalLines([]);
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const confidenceValue = 95.4;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (confidenceValue / 100) * circumference;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Bot size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Autonomous Agent</h1>
          <p>AI-powered threat detection, risk analysis, and autonomous mitigation</p>
        </div>
        <div className="page-actions">
          <span className="live-indicator">AI ACTIVE</span>
        </div>
      </div>

      {/* Agent Pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ChartCard title="AI Processing Pipeline" subtitle="Real-time autonomous decision workflow">
          <div className="agent-workflow">
            {PIPELINE_STEPS.map((step, i) => {
              const isActive = i === activeStepIndex;
              const isCompleted = i < activeStepIndex;
              return (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                  <motion.div
                    className={`agent-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <motion.div
                      className="agent-step-icon"
                      animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {isCompleted ? <CheckCircle size={20} /> : <step.icon size={20} />}
                    </motion.div>
                    <div className="agent-step-label">{step.label}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{step.description}</div>
                  </motion.div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <motion.div
                      className="agent-step-arrow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isCompleted ? 1 : 0.3 }}
                      style={{ color: isCompleted ? 'var(--color-success)' : 'var(--text-tertiary)' }}
                    >
                      →
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </ChartCard>
      </motion.div>

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        {/* AI Terminal */}
        <div className="col-8">
          <ChartCard title="AI Reasoning Stream" subtitle="Live autonomous decision log">
            <div className="ai-terminal" ref={terminalRef} style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <div className="ai-terminal-header">
                <div className="ai-terminal-dots">
                  <span /><span /><span />
                </div>
                <span className="ai-terminal-title">ARC Intelligence Engine — Live Feed</span>
              </div>
              <AnimatePresence>
                {terminalLines.map((line, i) => (
                  <motion.div
                    key={i}
                    className="ai-terminal-line"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {line.text ? (
                      <span className={line.type}>{line.text}</span>
                    ) : (
                      <br />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="ai-terminal-line">
                <span className="prompt">▸</span>
                <span className="ai-terminal-cursor" />
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Confidence Gauge + Stats */}
        <div className="col-4">
          <ChartCard title="Agent Performance" subtitle="Decision confidence & metrics">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
              {/* Confidence Gauge */}
              <div className="confidence-gauge">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle className="gauge-bg" cx="60" cy="60" r="50" />
                  <circle
                    className="gauge-fill"
                    cx="60" cy="60" r="50"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div style={{ textAlign: 'center' }}>
                  <div className="confidence-value">{confidenceValue}%</div>
                  <div className="confidence-label">Confidence</div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
                {[
                  { label: 'Decisions', value: '156', icon: Brain, color: 'var(--color-primary-400)' },
                  { label: 'Success Rate', value: '98.7%', icon: CheckCircle, color: 'var(--color-success)' },
                  { label: 'Avg Response', value: '1.2s', icon: Clock, color: 'var(--color-accent-400)' },
                  { label: 'Active Alerts', value: '3', icon: AlertTriangle, color: 'var(--color-warning)' },
                ].map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      textAlign: 'center',
                    }}
                  >
                    <metric.icon size={16} style={{ color: metric.color, marginBottom: '4px' }} />
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{metric.value}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{metric.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Decision Timeline */}
        <div className="col-6">
          <ChartCard title="Decision Timeline" subtitle="Recent autonomous actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {agentDecisions.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-lg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: d.outcome === 'success' ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.12)',
                    color: d.outcome === 'success' ? 'var(--color-success)' : 'var(--color-warning)',
                    flexShrink: 0,
                  }}>
                    {d.outcome === 'success' ? <CheckCircle size={16} /> : <Clock size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{d.decision}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {d.asset} • Confidence: {d.confidence}% • {d.executionTime}
                    </div>
                  </div>
                  <StatusBadge status={d.outcome} />
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Mitigation Actions */}
        <div className="col-6">
          <ChartCard title="Mitigation Actions" subtitle="Active and pending interventions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mitigationActions.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-lg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: a.triggeredBy === 'autonomous' ? 'rgba(26,86,219,0.12)' : 'rgba(107,114,128,0.12)',
                    color: a.triggeredBy === 'autonomous' ? 'var(--color-primary-400)' : 'var(--text-tertiary)',
                    flexShrink: 0,
                  }}>
                    {a.triggeredBy === 'autonomous' ? <Bot size={16} /> : <Wrench size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{a.type}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {a.targetName} {a.outcome ? `• ${a.outcome.slice(0, 50)}...` : ''}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Simulation Events */}
      {events.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <ChartCard title="Live Simulation — AI Responses" subtitle={`Step ${currentStep}/${totalSteps}`}>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {events.slice(0, 10).map((evt, i) => (
                <motion.div
                  key={evt.id}
                  className="intel-feed-item"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <StatusBadge status={evt.severity} />
                  <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>{evt.title}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{evt.description}</span>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
