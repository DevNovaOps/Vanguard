import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBadge from '../../components/common/StatusBadge';
import ChartCard from '../../components/common/ChartCard';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSimulation } from '../../contexts/SimulationContext';
import { useAuth } from '../../contexts/AuthContext';
import { agentService } from '../../utils/agentService';
import { networkService } from '../../utils/networkService';
import { timeAgo } from '../../utils/helpers';
import { Bot, Radio, AlertTriangle, Shield, Wrench, Zap, Brain, Target, CheckCircle, Clock } from 'lucide-react';

const PIPELINE_STEPS = [
  { label: 'Ingest', icon: Radio, description: 'Sensor telemetry' },
  { label: 'Detect', icon: AlertTriangle, description: 'Threat analysis' },
  { label: 'Classify', icon: Brain, description: 'Risk scoring' },
  { label: 'Validate', icon: Shield, description: 'Compliance check' },
  { label: 'Act', icon: Target, description: 'Generate mitigation' },
  { label: 'Execute', icon: Zap, description: 'Deploy action' },
];

export default function AutonomousAgent() {
  const { user } = useAuth();
  const { isRunning, currentStep, events, totalSteps } = useSimulation();

  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [terminalLines, setTerminalLines] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [actions, setActions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & Manual Telemetry Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    nodeId: '',
    temperature: 40,
    vibration: 5,
    gas: 10,
    power: 24,
    riskScore: 20
  });

  const printedActionIds = useRef(new Set());
  const lastSimStepRef = useRef(-1);
  const terminalRef = useRef(null);

  // Roles boundary definitions
  const isManager = user?.role === 'manager';
  const isOperator = user?.role === 'operator';
  const isSafetyOfficer = user?.role === 'safety_officer';
  const isAdmin = user?.role === 'admin';

  const canViewStats = isAdmin || isManager;
  const canViewActions = isAdmin || isSafetyOfficer || isOperator;
  const canEvaluate = isAdmin || isOperator;

  // Pipeline step transition animations
  useEffect(() => {
    if (!isRunning && activeStepIndex < 0) {
      const interval = setInterval(() => {
        setActiveStepIndex(prev => (prev + 1) % PIPELINE_STEPS.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isRunning, activeStepIndex]);

  // Terminal reasoning log formatter
  const printActionToTerminal = useCallback((action) => {
    const timeStr = new Date(action.createdAt).toLocaleTimeString();
    const nodeName = action.nodeId?.nodeName || 'Unknown';
    const nodeCode = action.nodeId?.nodeCode || 'N/A';
    
    const lines = [
      { text: `▸ [${timeStr}] TELEMETRY INGESTED: Corridors telemetry received for ${nodeName} (${nodeCode})`, type: 'info' },
      { text: `  Temp: ${action.telemetryData.temperature}°C | Vib: ${action.telemetryData.vibration}mm/s | Gas: ${action.telemetryData.gas}ppm | Power: ${action.telemetryData.power}kV`, type: 'muted' },
      { text: `▸ THREAT CLASSIFICATION: ${action.detectedThreat} (Severity: ${action.severity})`, type: action.severity === 'Critical' ? 'danger' : action.severity === 'High' ? 'warning' : 'success' },
      { text: `▸ COMPLIANCE ENFORCEMENT: Compliance risk calculated at ${action.telemetryData.riskScore}/100`, type: action.telemetryData.riskScore > 85 ? 'danger' : 'success' },
      { text: `✓ AUTONOMOUS ACTION EXECUTED: ${action.decision}`, type: 'success' },
      { text: `  Confidence: ${action.confidence}% | Reasoning: ${action.reasoning}`, type: 'success' },
      { text: '', type: '' }
    ];

    setTerminalLines(prev => {
      const combined = [...prev, ...lines];
      return combined.slice(-35);
    });

    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Set initial terminal greeting lines
  useEffect(() => {
    setTerminalLines([
      { text: '▸ Initializing ARC Intelligence Engine v2.4.1...', type: 'muted' },
      { text: '▸ Connecting to live telemetry flow...', type: 'info' },
      { text: '▸ Decision Core online. Monitoring active corridors...', type: 'success' },
      { text: '', type: '' }
    ]);
  }, []);

  // Fetch Dashboard Stats and Agent Actions from backend
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    setError(null);

    try {
      const promises = [];
      
      if (canViewStats) {
        promises.push(agentService.getDashboardStats());
      } else {
        promises.push(Promise.resolve(null));
      }

      if (canViewActions) {
        promises.push(agentService.getActions());
      } else {
        promises.push(Promise.resolve(null));
      }

      if (canEvaluate) {
        promises.push(networkService.getNodes());
      } else {
        promises.push(Promise.resolve(null));
      }

      const [statsRes, actionsRes, nodesRes] = await Promise.all(promises);

      if (statsRes && statsRes.success) {
        setStats(statsRes.stats);
      }

      if (actionsRes && actionsRes.success) {
        const fetchedActions = actionsRes.actions || [];
        setActions(fetchedActions);
        
        // Print any new actions to the terminal in chronological order
        const newActions = [...fetchedActions]
          .reverse()
          .filter(act => !printedActionIds.current.has(act._id));
          
        if (newActions.length > 0) {
          newActions.forEach(act => {
            printActionToTerminal(act);
            printedActionIds.current.add(act._id);
          });
        }
      }

      if (nodesRes && nodesRes.success) {
        setNodes(nodesRes.nodes || []);
        if (nodesRes.nodes?.length > 0 && !formData.nodeId) {
          setFormData(prev => ({ ...prev, nodeId: nodesRes.nodes[0]._id }));
        }
      }
    } catch (err) {
      if (!isSilent) {
        setError(err.message || 'Failed to sync with AI Decision Agent');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [canViewStats, canViewActions, canEvaluate, formData.nodeId, printActionToTerminal]);

  // Handle Fetching and Polling
  useEffect(() => {
    fetchData(false);

    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Hook simulation Step 6 ("AI Agent Activated") to trigger live API evaluation call
  useEffect(() => {
    if (isRunning && currentStep === 6 && lastSimStepRef.current !== currentStep) {
      lastSimStepRef.current = currentStep;
      
      const triggerSimEvaluate = async () => {
        try {
          const testNode = nodes.find(n => n.nodeCode === 'BRC') || nodes[0];
          if (!testNode) return;

          const telemetryPack = {
            nodeId: testNode._id,
            temperature: 95,
            vibration: 12,
            gas: 14,
            power: 24,
            riskScore: 87
          };

          const res = await agentService.evaluateTelemetry(telemetryPack);
          if (res.success && res.action) {
            await fetchData(true);
            if (!printedActionIds.current.has(res.action._id)) {
              printActionToTerminal(res.action);
              printedActionIds.current.add(res.action._id);
            }
          }
        } catch (err) {
          console.error('[SIMULATION-AGENT-TRIGGER] Failed:', err.message);
        }
      };

      triggerSimEvaluate();
    } else if (!isRunning) {
      lastSimStepRef.current = -1;
    }
  }, [isRunning, currentStep, nodes, fetchData, printActionToTerminal]);

  // Submit manual evaluation
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nodeId) {
      setFormError('Please select a target railway node.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await agentService.evaluateTelemetry(formData);
      if (res.success && res.action) {
        setIsModalOpen(false);
        await fetchData(true);
        if (!printedActionIds.current.has(res.action._id)) {
          printActionToTerminal(res.action);
          printedActionIds.current.add(res.action._id);
        }
        setFormData(prev => ({
          ...prev,
          temperature: 40,
          vibration: 5,
          gas: 10,
          power: 24,
          riskScore: 20
        }));
      }
    } catch (err) {
      setFormError(err.message || 'Telemetry evaluation pipeline failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Derive metrics
  const latestConfidence = actions.length > 0 ? actions[0].confidence : 95.4;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (latestConfidence / 100) * circumference;

  const timelineDecisions = actions.map(act => ({
    id: act._id,
    decision: act.decision,
    asset: act.nodeId ? `${act.nodeId.nodeName} (${act.nodeId.nodeCode})` : 'Unknown Node',
    confidence: act.confidence,
    executionTime: '1.2s',
    outcome: 'success'
  }));

  const mappedMitigations = actions.map(act => {
    const visualStatus = act.status === 'success' ? 'executed' : act.status;
    return {
      id: act._id,
      type: act.decision,
      targetName: act.nodeId ? act.nodeId.nodeName : 'Unknown Node',
      status: visualStatus,
      outcome: act.reasoning,
      triggeredBy: 'autonomous'
    };
  });

  if (loading && actions.length === 0 && (canViewActions || canViewStats)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && actions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 1rem' }} />
        <h3>Autonomous Agent Synchronization Failed</h3>
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
          <h1><Bot size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} /><span className="gradient-text">Autonomous Agent</span></h1>
          <p>AI-powered threat detection, risk analysis, and autonomous mitigation</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {canEvaluate && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
              <Zap size={14} /> Evaluate Telemetry
            </button>
          )}
          <span className="live-indicator">AI ACTIVE</span>
        </div>
      </div>

      {/* AI Processing Pipeline */}
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
        <div className={canViewStats ? 'col-8' : 'col-12'}>
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
        {canViewStats && (
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
                    <div className="confidence-value">{latestConfidence}%</div>
                    <div className="confidence-label">Confidence</div>
                  </div>
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
                  {[
                    { label: 'Decisions', value: stats?.totalActions || actions.length || 0, icon: Brain, color: 'var(--color-primary-400)' },
                    { label: 'Success Rate', value: stats?.successRate !== undefined ? `${stats.successRate}%` : '98.7%', icon: CheckCircle, color: 'var(--color-success)' },
                    { label: 'Avg Response', value: '1.2s', icon: Clock, color: 'var(--color-accent-400)' },
                    { label: 'Active Alerts', value: stats?.activeActions || 0, icon: AlertTriangle, color: 'var(--color-warning)' },
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
        )}

        {/* Decision Timeline */}
        {canViewActions && (
          <div className="col-6">
            <ChartCard title="Decision Timeline" subtitle="Recent autonomous actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                {timelineDecisions.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                    No decisions logged.
                  </div>
                ) : (
                  timelineDecisions.map((d, i) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
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
                  ))
                )}
              </div>
            </ChartCard>
          </div>
        )}

        {/* Mitigation Actions */}
        {canViewActions && (
          <div className="col-6">
            <ChartCard title="Mitigation Actions" subtitle="Active and pending interventions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                {mappedMitigations.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
                    No mitigations deployed.
                  </div>
                ) : (
                  mappedMitigations.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
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
                        <Bot size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{a.type}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          {a.targetName} {a.outcome ? `• ${a.outcome.slice(0, 50)}...` : ''}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </motion.div>
                  ))
                )}
              </div>
            </ChartCard>
          </div>
        )}
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

      {/* Manual Telemetry Evaluation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Evaluate Telemetry Pack" size="md">
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Select Railway Node</label>
            <select
              className="select"
              value={formData.nodeId}
              onChange={e => setFormData({ ...formData, nodeId: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
            >
              <option value="">-- Select a Node --</option>
              {nodes.map(n => (
                <option key={n._id} value={n._id}>{n.nodeName} ({n.nodeCode})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Temperature: {formData.temperature}°C</label>
            <input
              type="range"
              min="0"
              max="120"
              value={formData.temperature}
              onChange={e => setFormData({ ...formData, temperature: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--color-primary-500)' }}
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Gas Level: {formData.gas} ppm</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.gas}
              onChange={e => setFormData({ ...formData, gas: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--color-primary-500)' }}
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Track Vibration: {formData.vibration} mm/s</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.vibration}
              onChange={e => setFormData({ ...formData, vibration: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--color-primary-500)' }}
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Power Level: {formData.power} kV</label>
            <input
              type="range"
              min="15"
              max="30"
              value={formData.power}
              onChange={e => setFormData({ ...formData, power: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--color-primary-500)' }}
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Calculated Risk Score: {formData.riskScore}/100</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.riskScore}
              onChange={e => setFormData({ ...formData, riskScore: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--color-primary-500)' }}
            />
          </div>
          {formError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>{formError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Evaluating...' : 'Run Evaluation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
