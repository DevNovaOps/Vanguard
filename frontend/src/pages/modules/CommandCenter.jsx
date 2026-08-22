import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Settings,
  Volume2,
  VolumeX,
  Send,
  Bot,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Thermometer,
  Shield,
  Radio,
  Clock,
  MapPin,
  Gauge,
  User,
  Train,
  Cloud,
  Bell,
  Wrench
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Train3DModel from '../../components/modules/Train3DModel';
import { api } from '../../utils/api';
import ReactMarkdown from 'react-markdown';
import '../../styles/CommandCenter.css';
import { useOperationalContext } from '../../contexts/OperationalContext';
import ContextSwitcher from '../../components/modules/ContextSwitcher';

/* ============================================================
   ENTERPRISE RAILWAY OPERATIONS CENTER
   ============================================================ */

export default function CommandCenter() {
  // ── Operational Context ──
  const { 
    activeContext, 
    contextState, 
    updateContextState,
    isSwitching,
    registerStateCapture,
    contexts,
    compareContextId,
    compareContextState,
    switchContext
  } = useOperationalContext();

  // ── Data State ──
  const [summary, setSummary] = useState(null);
  const [twinState, setTwinState] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [predictive, setPredictive] = useState([]);

  // ── Centralized Context State (AI Chat & UI) ──
  const chatMessages = contextState?.chatMessages || [];
  const setChatMessages = (setter) => {
    updateContextState({ 
      chatMessages: typeof setter === 'function' ? setter(chatMessages) : setter 
    });
  };

  const rightDrawerTab = contextState?.rightDrawerTab || null;
  const setRightDrawerTab = (tab) => updateContextState({ rightDrawerTab: tab });

  const currentEnv = contextState?.currentEnv || 'Plains';
  const setCurrentEnv = (env) => updateContextState({ currentEnv: env });

  // ── Local UI State ──
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showMaintenanceDrawer, setShowMaintenanceDrawer] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());



  // ── Live Clock ──
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Data Fetching (PRESERVED — no API changes) ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resSummary = await api.get('/api/v1/command-center/executive-summary');
        if (resSummary.success) {
          setSummary(resSummary.data);
          if (voiceEnabled && resSummary.data.criticalAlerts > 0) {
            const speech = new SpeechSynthesisUtterance(`Warning: ${resSummary.data.criticalAlerts} critical alerts active.`);
            window.speechSynthesis.speak(speech);
          }
        }

        const resTwin = await api.get('/api/v1/command-center/digital-twin');
        if (resTwin.success) setTwinState(resTwin.data);

        const resWO = await api.get('/api/v1/command-center/work-orders');
        if (resWO.success) setWorkOrders(resWO.data);

        const resPred = await api.get('/api/v1/command-center/predictive-maintenance');
        if (resPred.success) setPredictive(resPred.data);

      } catch (err) {
        console.error('Failed to fetch command center data', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [voiceEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Environment Change Handler (PRESERVED) ──
  const handleEnvironmentChange = (env) => {
    setCurrentEnv(env);
    const alerts = {
      'Desert': { warning: 'Motor temperature increasing.', rec: 'Reduce speed by 10% to prevent overheat.' },
      'Snow': { warning: 'Wheel slip probability increased.', rec: 'Enable anti-slip braking and monitor traction.' },
      'Rain Forest': { warning: 'Track slip risk detected. Humidity high.', rec: 'Monitor track adhesion.' },
      'Coastal': { warning: 'High crosswinds detected on bridge approach.', rec: 'Monitor structural strain.' },
      'Tunnel': { warning: 'Entering tunnel. GPS signal dropped.', rec: 'Switching to internal telemetry. Monitor humidity.' },
      'Fog Zone': { warning: 'Visibility extremely low.', rec: 'Activate fog lights and reduce speed to 40 km/h.' }
    };

    if (alerts[env]) {
      const msg = `**Environment Alert: Entering ${env}**\n\n⚠️ **Warning**: ${alerts[env].warning}\n\n💡 **Recommendation**: ${alerts[env].rec}`;
      setChatMessages(prev => [...prev, { sender: 'agent', text: msg, time: new Date() }]);
      setRightDrawerTab('ai');

      if (voiceEnabled) {
        const speech = new SpeechSynthesisUtterance(`Entering ${env}. ${alerts[env].warning}`);
        window.speechSynthesis.speak(speech);
      }
    }
  };

  // ── Chat Handler (PRESERVED) ──
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput, time: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    const lowerInput = chatInput.toLowerCase();
    if (/^(hi|hello|hey|help|who are you|what can you do)/.test(lowerInput)) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          sender: 'agent',
          text: "Hello! I am the **Vanguard AI Assistant**.\n\nI can analyze live telemetry to detect anomalies, predict failures, and generate automatic mitigation plans. Try asking me:\n- *\"Assess the current network risk\"*\n- *\"What is the health of the engines?\"*",
          time: new Date()
        }]);
      }, 600);
      return;
    }

    try {
      const res = await api.post('/api/v1/command-center/chat', { query: userMsg.text });

      if (res.success && res.data) {
        const markdownResponse = `**Analysis Complete** (Risk Level: ${res.data.risk_level})\n\n**Action Recommended:** ${res.data.mitigation_actions || 'None'}\n\n${res.data.executive_summary}\n\n*Reasoning:* ${res.data.reasoning || 'N/A'}`;

        setChatMessages(prev => [...prev, { sender: 'agent', text: markdownResponse, time: new Date() }]);

        if (voiceEnabled && res.data.risk_level === 'Critical') {
          const speech = new SpeechSynthesisUtterance(`Critical Alert: ${res.data.executive_summary}`);
          window.speechSynthesis.speak(speech);
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { sender: 'agent', text: 'Error connecting to AI Agent.', time: new Date() }]);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled) window.speechSynthesis.cancel();
  };

  // ── Derived KPI Data ──
  const alertCount = summary?.criticalAlerts || 0;
  const envIcons = {
    'Plains': '🌿', 'Desert': '🏜️', 'Snow': '❄️', 'Rain Forest': '🌧️',
    'Coastal': '🌊', 'Tunnel': '🚇', 'Fog Zone': '🌫️'
  };

  // ── Incident Feed (static demo data) ──
  const incidents = [
    { time: '08:10', text: 'Bridge vibration sensor triggered', severity: 'warning' },
    { time: '08:12', text: 'AI Prediction: Bearing wear detected', severity: 'critical' },
    { time: '08:15', text: 'Work Order #WO-2847 auto-generated', severity: 'info' },
    { time: '08:16', text: 'Engineer R. Sharma assigned', severity: 'info' },
    { time: '08:20', text: 'Track strain within limits', severity: 'healthy' },
    { time: '08:25', text: 'Power grid stable at 25.1 kV', severity: 'healthy' },
    { time: '08:30', text: 'OHE current spike detected', severity: 'warning' },
    { time: '08:35', text: 'Environment transition: Desert zone', severity: 'info' },
  ];

  /* ================================================================
     STYLES
     ================================================================ */
  const S = {
    page: {
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)',
      width: '100%', overflow: 'hidden', background: '#0a0f1e',
      fontFamily: "'Inter', system-ui, sans-serif", color: '#e2e8f0'
    },
    // ── Header ──
    header: {
      height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', background: 'rgba(10, 15, 30, 0.85)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.04)', zIndex: 100, flexShrink: 0
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
    badge: (bg, color, border) => ({
      fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600',
      background: bg, color: color, border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.3px'
    }),
    headerBtn: {
      width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
    },
    // ── KPI Bar ──
    kpiBar: {
      height: '56px', display: 'flex', alignItems: 'center', gap: '8px',
      padding: '0 20px', background: 'rgba(10, 15, 30, 0.6)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.03)', flexShrink: 0, overflowX: 'auto'
    },
    kpiCard: (accentColor) => ({
      flex: '1 1 0', minWidth: '140px', height: '40px', display: 'flex', alignItems: 'center', gap: '10px',
      padding: '0 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.04)', cursor: 'default',
      borderLeft: `3px solid ${accentColor}`, transition: 'all 0.2s'
    }),
    kpiIcon: { color: '#64748b', flexShrink: 0 },
    kpiValue: { fontSize: '15px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#f8fafc', lineHeight: 1 },
    kpiLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 },
    // ── Sidebar (Train Manager) ──
    sidebar: {
      width: '15%', minWidth: '240px', maxWidth: '300px', display: 'flex', flexDirection: 'column',
      background: 'rgba(10, 15, 30, 0.95)', borderRight: '1px solid rgba(255,255,255,0.05)',
      padding: '16px', overflowY: 'auto'
    },
    sidebarSectionTitle: {
      fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase',
      letterSpacing: '1px', marginBottom: '12px', marginTop: '20px'
    },
    // ── Canvas Container ──
    canvasWrap: {
      flex: 1, position: 'relative', overflow: 'hidden'
    },
    // ── Bottom Dock ──
    dock: {
      position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: '4px',
      background: 'rgba(10, 15, 30, 0.7)', backdropFilter: 'blur(20px)',
      padding: '6px 10px', borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.4)', zIndex: 20, pointerEvents: 'auto'
    },
    dockBtn: (active) => ({
      width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
      border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '17px',
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', outline: 'none',
      boxShadow: active ? 'inset 0 0 0 1px rgba(59, 130, 246, 0.5)' : 'none'
    }),
    dockDivider: { width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)', margin: '0 4px' },
    // ── Right Drawer ──
    drawer: {
      position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
      background: 'rgba(10, 15, 30, 0.92)', backdropFilter: 'blur(24px)',
      borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex',
      flexDirection: 'column', overflow: 'hidden', zIndex: 60,
      boxShadow: '-20px 0 60px rgba(0,0,0,0.5)'
    },
    drawerTab: (active) => ({
      flex: 1, padding: '10px 0', background: 'none', border: 'none',
      borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
      color: active ? '#f8fafc' : '#64748b', cursor: 'pointer',
      fontSize: '12px', fontWeight: '600', textTransform: 'uppercase',
      letterSpacing: '0.5px', transition: 'all 0.2s'
    }),
    // ── Maintenance Drawer ──
    maintDrawer: (expanded) => ({
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: expanded ? '350px' : '0px',
      background: 'rgba(10, 15, 30, 0.92)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 15,
      overflow: 'hidden', transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    })
  };

  /* ================================================================
     RENDER
     ================================================================ */

  // Block render during context switch to prevent stale data flashing
  if (!activeContext || isSwitching) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e', color: '#64748b' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Activity size={32} color="#3b82f6" />
          </motion.div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>Loading Operational Context...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>

      {/* ════════════════════════════════════════════
          HEADER BAR (48px)
      ════════════════════════════════════════════ */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', letterSpacing: '1px' }}>
            VANGUARD ARC
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
          
          {/* Visual Context Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '16px' }}>{activeContext.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{activeContext.name}</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeContext.status === 'Active' ? '#10b981' : '#f59e0b', boxShadow: `0 0 8px ${activeContext.status === 'Active' ? '#10b981' : '#f59e0b'}` }} />
              <span style={{ fontSize: '10px', color: activeContext.status === 'Active' ? '#10b981' : '#f59e0b', fontWeight: '600', textTransform: 'uppercase' }}>
                {activeContext.status === 'Active' ? 'Running' : activeContext.status}
              </span>
            </div>
            
            <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{activeContext.type}</span>
          </div>
        </div>

        <ContextSwitcher />

        <div style={S.headerRight}>
          {/* Environment Badge */}
          <div style={S.badge('rgba(59,130,246,0.12)', '#60a5fa', 'rgba(59,130,246,0.25)')}>
            <MapPin size={11} /> {envIcons[currentEnv] || '🌿'} {currentEnv}
          </div>

          {/* Speed */}
          <div style={S.badge('rgba(16,185,129,0.12)', '#34d399', 'rgba(16,185,129,0.25)')}>
            <Gauge size={11} /> {twinState?.speed || 112} km/h
          </div>

          {/* Alert Count */}
          {alertCount > 0 && (
            <div style={S.badge('rgba(239,68,68,0.15)', '#f87171', 'rgba(239,68,68,0.3)')}>
              <Bell size={11} /> {alertCount} Alert{alertCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Clock */}
          <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'JetBrains Mono', monospace", fontWeight: '500' }}>
            {currentTime.toLocaleTimeString('en-IN', { hour12: false })}
          </div>

          {/* Voice Toggle */}
          <button onClick={toggleVoice} style={{
            ...S.headerBtn,
            background: voiceEnabled ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
            color: voiceEnabled ? '#60a5fa' : '#f87171',
            border: `1px solid ${voiceEnabled ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`
          }} title={voiceEnabled ? 'Voice ON' : 'Voice OFF'}>
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Profile */}
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <User size={14} color="white" />
          </div>
        </div>
      </div>

            {/* ════════════════════════════════════════════
          MAIN LAYOUT WITH SIDEBAR (85% Digital Twin)
      ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
        
        {/* LEFT SIDEBAR (15%) - TRAIN MANAGER & COMPACT KPIs */}
        <div style={S.sidebar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Activity size={18} color="#3b82f6" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.5px' }}>Asset Manager</span>
          </div>

          <div style={{ ...S.sidebarSectionTitle, marginTop: 0 }}>Compact KPIs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={S.kpiCard('#10b981')}>
              <Shield size={14} style={S.kpiIcon} />
              <div>
                <div style={S.kpiValue}>{summary?.overallHealth || '98.2%'}</div>
                <div style={S.kpiLabel}>Sys Health</div>
              </div>
            </div>
            <div style={S.kpiCard(alertCount > 0 ? '#ef4444' : '#10b981')}>
              <AlertTriangle size={14} style={{ ...S.kpiIcon, color: alertCount > 0 ? '#f87171' : '#64748b' }} />
              <div>
                <div style={{ ...S.kpiValue, color: alertCount > 0 ? '#f87171' : '#f8fafc' }}>{alertCount}</div>
                <div style={S.kpiLabel}>Alerts</div>
              </div>
            </div>
            <div style={S.kpiCard('#f59e0b')}>
              <Zap size={14} style={S.kpiIcon} />
              <div>
                <div style={S.kpiValue}>25.0<span style={{ fontSize: '11px', color: '#64748b' }}>kV</span></div>
                <div style={S.kpiLabel}>Power</div>
              </div>
            </div>
            <div style={S.kpiCard('#06b6d4')}>
              <Cloud size={14} style={S.kpiIcon} />
              <div>
                <div style={S.kpiValue}>32<span style={{ fontSize: '11px', color: '#64748b' }}>°C</span></div>
                <div style={S.kpiLabel}>Weather</div>
              </div>
            </div>
          </div>

          <div style={S.sidebarSectionTitle}>Active Trains</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {contexts.filter(c => c.type === 'Train' || c.type === 'Freight').map(c => (
                <div 
                  key={c.id} 
                  onClick={() => switchContext(c.id)}
                  style={{ 
                    padding: '10px 12px', background: activeContext?.id === c.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${activeContext?.id === c.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'all 0.2s'
                  }}
                >
                   <span style={{ fontSize: '16px' }}>{c.icon}</span>
                   <div style={{ flex: 1, overflow: 'hidden' }}>
                     <div style={{ fontSize: '12px', fontWeight: '600', color: activeContext?.id === c.id ? '#60a5fa' : '#cbd5e1', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.name}</div>
                     <div style={{ fontSize: '10px', color: '#64748b' }}>Speed: {c.id === activeContext?.id ? (twinState?.speed || 112) : 0} km/h</div>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* RIGHT AREA (85%) - DIGITAL TWIN VIEWS */}
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {[
            { isPrimary: true, ctx: activeContext, state: contextState, alerts: alertCount, env: currentEnv },
            ...(compareContextId ? [{ 
              isPrimary: false, 
              ctx: contexts.find(c => c.id === compareContextId), 
              state: compareContextState, 
              alerts: compareContextState?.incidents?.length || 0,
              env: compareContextState?.currentEnv || 'Plains'
            }] : [])
          ].filter(v => v.ctx).map((view, idx) => (
            <div key={view.ctx.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', borderRight: idx === 0 && compareContextId ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              
              {/* CANVAS WRAP */}
              <div style={S.canvasWrap}>
                {!view.isPrimary && (
                  <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(59, 130, 246, 0.2)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.5)', color: '#60a5fa', fontSize: '11px', fontWeight: 'bold' }}>
                    COMPARING: {view.ctx.name}
                  </div>
                )}
                
                <Canvas
                  key={`digital-twin-${view.ctx.id}`}
                  camera={{ position: [0, 5, 10], fov: 45 }}
                  style={{ width: '100%', height: '100%' }}
                  dpr={[1, 1.5]}
                  performance={{ min: 0.5 }}
                >
                  <Train3DModel 
                    twinState={view.isPrimary ? twinState : null} 
                    onEnvironmentChange={view.isPrimary ? handleEnvironmentChange : () => {}} 
                    restoredState={view.state?.twin}
                    onStateCapture={view.isPrimary ? registerStateCapture : () => {}}
                    contextName={view.ctx.name}
                  />
                  <OrbitControls enableZoom={true} enablePan={true} maxPolarAngle={Math.PI / 2} />
                </Canvas>
              </div>
            </div>
          ))}
        </div>

        {/* ── FLOATING BOTTOM DOCK ── */}
        <div style={S.dock}>
          {/* Camera Controls */}
          {[
            { id: 'isometric', icon: '🏠', label: 'Overview' },
            { id: 'driver', icon: '🚂', label: 'Engine' },
            { id: 'station', icon: '🚉', label: 'Station' },
            { id: 'bridge', icon: '🌉', label: 'Bridge' },
            { id: 'tunnel', icon: '🏔️', label: 'Tunnel' },
          ].map(cam => (
            <button
              key={cam.id}
              style={S.dockBtn(false)}
              title={cam.label}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {cam.icon}
            </button>
          ))}

          <div style={S.dockDivider} />

          {/* Utility Controls */}
          <button style={S.dockBtn(false)} title="Power"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >⚡</button>
          <button style={S.dockBtn(false)} title="Weather"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >🌦️</button>

          <div style={S.dockDivider} />

          {/* Action Controls */}
          <button style={S.dockBtn(false)} title="Emergency Sim"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >🚨</button>
          <button
            onClick={() => setShowMaintenanceDrawer(!showMaintenanceDrawer)}
            style={S.dockBtn(showMaintenanceDrawer)}
            title="Maintenance Queue"
            onMouseEnter={e => { if (!showMaintenanceDrawer) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (!showMaintenanceDrawer) e.currentTarget.style.background = 'transparent'; }}
          >
            <Settings size={17} color="#94a3b8" />
          </button>
          <button
            onClick={() => setRightDrawerTab(rightDrawerTab ? null : 'ai')}
            style={S.dockBtn(!!rightDrawerTab)}
            title="AI Assistant"
          >
            <Bot size={17} color={rightDrawerTab ? '#60a5fa' : '#94a3b8'} />
          </button>
        </div>

        {/* ── MAINTENANCE BOTTOM DRAWER ── */}
        <div style={S.maintDrawer(showMaintenanceDrawer)}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wrench size={16} color="#60a5fa" />
              <span style={{ fontWeight: '600', color: '#f8fafc', fontSize: '14px', letterSpacing: '0.5px' }}>Maintenance Queue</span>
              <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{workOrders.length}</span>
            </div>
            <button onClick={() => setShowMaintenanceDrawer(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100% - 53px)' }}>
            {workOrders.map((wo, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '8px', borderLeft: `3px solid ${wo.priority === 'High' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{wo.id}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(wo.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{wo.description}</div>
              </div>
            ))}
            {workOrders.length === 0 && <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No active work orders.</div>}
          </div>
        </div>

        {/* ── AI ASSISTANT RIGHT DRAWER ── */}
        <AnimatePresence>
          {rightDrawerTab === 'ai' && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={S.drawer}
            >
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <Bot size={20} color="#60a5fa" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.5px' }}>Vanguard AI Agent</div>
                    <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Online</div>
                  </div>
                </div>
                <button onClick={() => setRightDrawerTab(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Chat Feed */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: msg.sender === 'user' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.05)',
                      border: msg.sender === 'agent' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {msg.sender === 'user' ? <User size={12} color="white" /> : <Bot size={12} color="#94a3b8" />}
                    </div>
                    <div style={{
                      maxWidth: '85%', padding: '12px 16px', borderRadius: '12px',
                      background: msg.sender === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: msg.sender === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6'
                    }}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Ask AI to analyze infrastructure..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: '#3b82f6', border: 'none', width: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Send size={14} color="white" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
