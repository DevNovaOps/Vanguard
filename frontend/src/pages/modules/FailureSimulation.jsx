import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import ChartCard from '../../components/common/ChartCard';
import KPICard from '../../components/common/KPICard';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSimulation } from '../../contexts/SimulationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils/helpers';
import rawNodes from '../../data/vanguard_railway_nodes_1200.json';
import {
  Zap, Play, Square, Clock, CheckCircle, XCircle, AlertTriangle,
  Radio, Shield, BarChart3, Bot, Wrench, Wifi, FileText,
  Activity, History, TrendingUp, Timer, ChevronDown, Database
} from 'lucide-react';

// Step metadata for the timeline matching 7 agents
const STEP_META = [
  { id: 1, name: 'Generating Failure Scenario', icon: Radio, module: 'telemetry', color: '#3b82f6' },
  { id: 2, name: 'Executing 7-Agent Pipeline', icon: Bot, module: 'agent', color: '#f59e0b' },
  { id: 3, name: 'Aggregating Results', icon: BarChart3, module: 'reports', color: '#ef4444' },
  { id: 4, name: 'Calculating Risk', icon: Shield, module: 'risk', color: '#10b981' },
  { id: 5, name: 'Prioritizing Incidents', icon: Database, module: 'database', color: '#a855f7' },
  { id: 6, name: 'Generating Actions', icon: Wrench, module: 'incidents', color: '#06b6d4' },
  { id: 7, name: 'Stabilizing System', icon: CheckCircle, module: 'network', color: '#ec4899' },
];

export default function FailureSimulation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    isRunning, currentStep, totalSteps, completedSteps,
    events, liveStepData, simulationRunId,
    simulationError, clearSimulationError,
    runFailureSimulation, SIMULATION_STEPS
  } = useSimulation();

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedRunEvents, setSelectedRunEvents] = useState([]);
  const [showRunDetails, setShowRunDetails] = useState(false);

  const [selectedNodeCode, setSelectedNodeCode] = useState('BRC');
  const [temperature, setTemperature] = useState(135);
  const [vibration, setVibration] = useState(85);
  const [gas, setGas] = useState(40);
  const [power, setPower] = useState(24);

  // Dynamic risk calculation in UI
  const calculatedRiskScore = useMemo(() => {
    let totalPoints = 0;

    // Temperature
    if (temperature < 70) totalPoints += 10;
    else if (temperature <= 90) totalPoints += 25;
    else totalPoints += 40;

    // Vibration
    if (vibration < 40) totalPoints += 10;
    else if (vibration <= 80) totalPoints += 25;
    else totalPoints += 35;

    // Gas
    if (gas < 30) totalPoints += 5;
    else if (gas <= 70) totalPoints += 15;
    else totalPoints += 30;

    // Power
    if (power >= 15 && power <= 30) totalPoints += 0;
    else totalPoints += 20;

    return Math.min(totalPoints, 100);
  }, [temperature, vibration, gas, power]);

  const calculatedSeverity = useMemo(() => {
    if (calculatedRiskScore <= 29) return 'Low';
    if (calculatedRiskScore <= 59) return 'Medium';
    if (calculatedRiskScore <= 79) return 'High';
    return 'Critical';
  }, [calculatedRiskScore]);
  const eventLogRef = useRef(null);
  const detailsRef = useRef(null);

  const canTrigger = user?.role === 'admin' || user?.role === 'safety_officer' || user?.role === 'Admin' || user?.role === 'SafetyOfficer';

  // Load history and stats on mount
  useEffect(() => {
    loadData();
  }, []);

  // Auto-scroll event log
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = 0;
    }
  }, [events]);

  // Reload history when simulation starts or completes
  useEffect(() => {
    loadData();
  }, [isRunning]);

  // Scroll to details panel when opened
  useEffect(() => {
    if (showRunDetails && selectedRun && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showRunDetails, selectedRun]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        api.get('/api/simulation/history'),
        api.get('/api/simulation/stats')
      ]);
      setHistory(historyRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('[SIMULATION-PAGE] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleViewRun = async (row) => {
    try {
      console.log('[SIMULATION-PAGE] Fetching run details for:', row.runId);
      const res = await api.get(`/api/simulation/${row.runId}`);
      console.log('[SIMULATION-PAGE] Received run details:', res);
      setSelectedRun(res.data.run);
      setSelectedRunEvents(res.data.events || []);
      setShowRunDetails(true);
    } catch (err) {
      console.error('[SIMULATION-PAGE] Failed to load run details:', err);
    }
  };

  // Determine step status for timeline
  const getStepStatus = (stepId) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (isRunning && currentStep === stepId) return 'running';
    if (isRunning && stepId > currentStep) return 'pending';
    return 'idle';
  };

  // History table columns
  const historyColumns = [
    { key: 'runId', label: 'Run ID', width: '140px' },
    {
      key: 'status', label: 'Status', width: '110px',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'nodeId', label: 'Target Node', width: '160px',
      render: (val) => val ? `${val.nodeName} (${val.nodeCode})` : '—'
    },
    {
      key: 'completedSteps', label: 'Steps', width: '80px',
      render: (val, row) => `${val}/${row.totalSteps}`
    },
    {
      key: 'result', label: 'Risk Score', width: '100px',
      render: (val) => val?.riskScore ? `${val.riskScore}/100` : '—'
    },
    {
      key: 'triggeredBy', label: 'Triggered By', width: '140px',
      render: (val) => val?.name || 'System'
    },
    {
      key: 'createdAt', label: 'Time', width: '120px',
      render: (val) => val ? timeAgo(val) : '—'
    },
    {
      key: '_actions', label: '', width: '80px', sortable: false,
      render: (_, row) => (
        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleViewRun(row); }}>
          View
        </button>
      )
    }
  ];

  return (
    <div id="failure-simulation-page">
      {/* Page Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={28} style={{ color: 'var(--accent-primary)' }} />
            <span className="gradient-text">Failure Simulation Engine</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Orchestrate end-to-end failure cascade simulations across all Vanguard ARC modules
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isRunning && (
            <div className="simulation-live-indicator" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: 'var(--text-sm)', color: '#ef4444', fontWeight: 600
            }}>
              <span className="live-indicator" style={{ width: 8, height: 8 }}><span /></span>
              LIVE — Step {currentStep}/{totalSteps}
            </div>
          )}
          {canTrigger && (
            <button
              id="simulation-trigger-btn"
              className={`btn ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => runFailureSimulation(selectedNodeCode, temperature, vibration, gas, power, calculatedRiskScore, navigate)}
              disabled={isRunning}
              style={{ minWidth: '220px' }}
            >
              {isRunning ? 'Running Vanguard Analysis...' : <><Play size={16} /> Run Failure Simulation</>}
            </button>
          )}
        </div>
      </motion.div>

      {/* VANGUARD FIX: Error Banner — displayed when simulation fails */}
      <AnimatePresence>
        {simulationError && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.5rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-lg)',
              borderLeft: '4px solid #ef4444',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#ef4444', marginBottom: '0.25rem' }}>
                Simulation Failed
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {simulationError}
              </div>
            </div>
            <button
              onClick={clearSimulationError}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#ef4444',
                padding: '0.25rem 0.75rem',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats Row */}
      {stats && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
          <KPICard label="Total Runs" value={stats.totalRuns} icon="Activity" color="blue" delay={100} />
          <KPICard label="Completed" value={stats.completedRuns} icon="CheckCircle" color="green" delay={200} />
          <KPICard label="Success Rate" value={`${stats.successRate}%`} icon="TrendingUp" color="purple" delay={300} />
          <KPICard label="Avg Duration" value={stats.avgDuration > 0 ? `${(stats.avgDuration / 1000).toFixed(1)}s` : '—'} icon="Timer" color="orange" delay={400} />
        </div>
      )}

      {/* Simulation Configuration Control Panel */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
          <Radio size={18} style={{ color: 'var(--accent-primary)' }} />
          Simulation Configuration
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
          {/* Target Station Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>TARGET RAILWAY NODE</label>
            <select
              value={selectedNodeCode}
              onChange={(e) => setSelectedNodeCode(e.target.value)}
              disabled={isRunning}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.6rem 0.8rem',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
                height: '42px'
              }}
            >
              {rawNodes.map((n) => (
                <option key={n.nodeCode} value={n.nodeCode}>
                  {n.nodeName} ({n.nodeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Parameter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>TEMPERATURE</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{temperature} °C</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginTop: '6px' }}
            />
          </div>

          {/* Vibration Parameter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>VIBRATION</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{vibration} mm/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              value={vibration}
              onChange={(e) => setVibration(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginTop: '6px' }}
            />
          </div>

          {/* Hazardous Gas Parameter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>HAZARDOUS GAS</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{gas} ppm</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={gas}
              onChange={(e) => setGas(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginTop: '6px' }}
            />
          </div>

          {/* Power Grid voltage Parameter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>POWER GRID VOLTAGE</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{power} kV</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer', marginTop: '6px' }}
            />
          </div>

          {/* Calculated Output Preview */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 1rem',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--glass-border)',
            minWidth: '220px',
            height: '42px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Calculated Risk</span>
              <span style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: calculatedSeverity === 'Critical' ? '#ef4444' : calculatedSeverity === 'High' ? '#f59e0b' : calculatedSeverity === 'Medium' ? '#3b82f6' : '#10b981'
              }}>
                {calculatedRiskScore}/100
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Severity Level</span>
              <span style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: calculatedSeverity === 'Critical' ? '#ef4444' : calculatedSeverity === 'High' ? '#f59e0b' : calculatedSeverity === 'Medium' ? '#3b82f6' : '#10b981'
              }}>
                {calculatedSeverity}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">

        {/* Left: 9-Step Timeline */}
        <div className="col-8">
          <ChartCard title="Simulation Pipeline" subtitle={isRunning ? `Running — Step ${currentStep}/${totalSteps}` : 'Ready to execute'}>
          <div className="simulation-timeline" style={{ padding: '1rem 0' }}>
            {STEP_META.map((step, idx) => {
              const status = getStepStatus(step.id);
              const StepIcon = step.icon;
              const stepData = liveStepData[step.id];

              return (
                <motion.div
                  key={step.id}
                  className={`sim-step sim-step-${status}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    padding: '0.75rem 1rem', marginBottom: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: status === 'completed' ? 'rgba(34,197,94,0.06)' :
                      status === 'running' ? 'rgba(59,130,246,0.08)' :
                        'transparent',
                    border: status === 'running' ? '1px solid rgba(59,130,246,0.3)' :
                      status === 'completed' ? '1px solid rgba(34,197,94,0.15)' :
                        '1px solid transparent',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Step Connector Line */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    minWidth: '36px'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: status === 'completed' ? step.color :
                        status === 'running' ? 'var(--accent-primary)' :
                          'var(--bg-tertiary)',
                      color: status === 'idle' ? 'var(--text-tertiary)' : '#fff',
                      transition: 'all 0.4s ease',
                      boxShadow: status === 'running' ? `0 0 12px ${step.color}40` : 'none'
                    }}>
                      {status === 'completed' ? <CheckCircle size={18} /> :
                        status === 'running' ?
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                            <Activity size={18} />
                          </motion.div> :
                          <StepIcon size={16} />
                      }
                    </div>
                    {idx < STEP_META.length - 1 && (
                      <div style={{
                        width: 2, height: '100%', minHeight: '8px',
                        background: status === 'completed' ? step.color : 'var(--border-color)',
                        opacity: status === 'completed' ? 0.5 : 0.2,
                        transition: 'all 0.4s ease'
                      }} />
                    )}
                  </div>

                  {/* Step Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        fontSize: 'var(--text-xs)', fontWeight: 700,
                        color: step.color, opacity: status === 'idle' ? 0.4 : 1,
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        Step {step.id}
                      </span>
                      <span style={{
                        fontSize: 'var(--text-xs)',
                        padding: '0.1rem 0.4rem', borderRadius: '4px',
                        background: `${step.color}15`, color: step.color,
                        fontWeight: 500
                      }}>
                        {step.module}
                      </span>
                      {status === 'running' && (
                        <span className="badge badge-info badge-dot" style={{ fontSize: 'var(--text-xs)' }}>Processing</span>
                      )}
                    </div>
                    <div style={{
                      fontWeight: 600, fontSize: 'var(--text-sm)',
                      color: status === 'idle' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      marginBottom: '0.15rem'
                    }}>
                      {step.name}
                    </div>
                    {stepData?.description && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{
                          fontSize: 'var(--text-xs)', color: 'var(--text-secondary)',
                          lineHeight: 1.4
                        }}
                      >
                        {stepData.description}
                      </motion.div>
                    )}
                    {stepData?.duration && (
                      <span style={{
                        fontSize: '11px', color: 'var(--text-tertiary)',
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        marginTop: '0.2rem'
                      }}>
                        <Timer size={10} /> {stepData.duration}ms
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          </ChartCard>
        </div>

        {/* Right: Live Event Log */}
        <div className="col-4">
          <ChartCard title="Live Event Log" subtitle={`${events.length} events`}>
          <div
            ref={eventLogRef}
            style={{
              maxHeight: '540px', overflowY: 'auto',
              padding: '0.5rem', fontFamily: 'var(--font-mono, monospace)',
              fontSize: '12px', lineHeight: 1.6
            }}
          >
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '3rem 1rem' }}>
                <Activity size={24} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                <p>No simulation events yet. Click "Run Failure Simulation" to begin.</p>
              </div>
            ) : (
              <AnimatePresence>
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 10, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      padding: '0.4rem 0.5rem',
                      borderBottom: '1px solid var(--border-color)',
                      borderLeft: `3px solid ${event.severity === 'danger' ? '#ef4444' :
                        event.severity === 'warning' ? '#f59e0b' :
                          event.severity === 'success' ? '#22c55e' : '#3b82f6'
                        }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px' }}>
                        {event.step ? `[${event.step}/7] ` : ''}{event.title}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '10px', whiteSpace: 'nowrap' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {event.description}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          </ChartCard>
        </div>
      </div>

      {/* Progress Bar (shown only during simulation) */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          style={{
            marginBottom: '1.5rem', padding: '1rem 1.5rem',
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              Simulation Progress
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {completedSteps.length}/{totalSteps} steps completed
            </span>
          </div>
          <div style={{
            height: '8px', borderRadius: '4px',
            background: 'var(--bg-tertiary)', overflow: 'hidden'
          }}>
            <motion.div
              style={{
                height: '100%', borderRadius: '4px',
                background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #22c55e)'
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${(completedSteps.length / totalSteps) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* History Table */}
      <ChartCard title="Simulation History" subtitle={`${history.length} past runs`}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><LoadingSpinner /></div>
        ) : (
          <DataTable
            data={history.map(h => ({ ...h, id: h._id || h.runId }))}
            columns={historyColumns}
            pageSize={8}
            exportFilename="simulation_history"
            emptyMessage="No simulation runs yet. Trigger your first simulation above."
            onRowClick={handleViewRun}
          />
        )}
      </ChartCard>

      {/* Run Details Panel (Expandable) */}
      <AnimatePresence>
        {showRunDetails && selectedRun && (
          <motion.div
            ref={detailsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              marginTop: '1.5rem', padding: '1.5rem',
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                  Run Details — {selectedRun.runId}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <span>Status: <StatusBadge status={selectedRun.status} /></span>
                  <span>Node: {selectedRun.nodeId?.nodeName || '—'}</span>
                  <span>Steps: {selectedRun.completedSteps}/{selectedRun.totalSteps}</span>
                  {selectedRun.result?.riskScore > 0 && <span>Risk: {selectedRun.result.riskScore}/100</span>}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRunDetails(false)}>
                Close
              </button>
            </div>

            {/* Events Timeline for Selected Run */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {selectedRunEvents.map((evt) => {
                const meta = STEP_META.find(s => s.id === evt.stepNumber);
                return (
                  <div
                    key={evt._id}
                    style={{
                      padding: '0.75rem', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      border: `1px solid ${evt.status === 'completed' ? `${meta?.color || '#22c55e'}30` : 'var(--border-color)'}`,
                      borderLeft: `4px solid ${meta?.color || 'var(--border-color)'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: meta?.color }}>
                        Step {evt.stepNumber}
                      </span>
                      <StatusBadge status={evt.status} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>
                      {evt.stepName}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {evt.description}
                    </div>
                    {evt.duration > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        <Timer size={10} style={{ verticalAlign: 'middle' }} /> {evt.duration}ms
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
