import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, AlertTriangle, Zap, Cloud, Radio, Clock, Thermometer, ChevronUp, ChevronDown, User, Settings, Filter, X, Menu, Bot, Wrench, Volume2, VolumeX, Bell, Map as MapIcon } from 'lucide-react';
import { useOperationalContext } from '../../contexts/OperationalContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Train3DModel from '../../components/modules/Train3DModel';
import ReactMarkdown from 'react-markdown';
import { MAP_PRESETS, MAP_ORDER } from '../../components/modules/digital-twin/MapPresets';

const NOOP = () => {};

export default function CommandCenter() {
  const { 
    activeContext, 
    contextState, 
    updateContextState,
    isSwitching,
    registerStateCapture,
    contexts,
    compareContextId,
    compareContextState,
    switchContext,
    toggleCompareContext
  } = useOperationalContext();

  const [summary, setSummary] = useState(null);
  const [twinState, setTwinState] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [predictive, setPredictive] = useState([]);
  const [trainSpeeds, setTrainSpeeds] = useState({ passenger: 0, freight: 0, vandebharat: 0 });

  const chatMessages = contextState?.chatMessages?.filter(msg => !msg.text.includes('Environment Alert')) || [];
  const environmentAlerts = contextState?.chatMessages?.filter(msg => msg.text.includes('Environment Alert')) || [];
  
  const activeMapId = twinState?.activeMap || 'sunny';
  const activeMapConfig = MAP_PRESETS[activeMapId] || MAP_PRESETS.sunny;
  const alertCount = contextState?.incidents?.length || 0;

  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [rightDrawerTab, setRightDrawerTab] = useState(null); // 'ai' | null
  const [showMaintenanceDrawer, setShowMaintenanceDrawer] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showCompareSelector, setShowCompareSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Expose global function for TrainEntity to update real-time speeds
    // Throttled: only update state when speed changes by >= 1 km/h
    const lastSpeeds = { passenger: 0, freight: 0, vandebharat: 0 };
    window.updateTrainSpeed = (id, speed) => {
      const rounded = Math.round(speed);
      if (lastSpeeds[id] !== rounded) {
        lastSpeeds[id] = rounded;
        setTrainSpeeds(prev => {
          if (prev[id] === rounded) return prev; // no change, skip re-render
          return { ...prev, [id]: rounded };
        });
      }
    };
    return () => { delete window.updateTrainSpeed; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, rightDrawerTab]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!contextState) return;
    setSummary(contextState.summary);
    // Only sync twin state if not already set (initial load or context switch)
    // Don't overwrite user-initiated changes (map switch, speed adjust, etc.)
    if (!twinState && contextState.twin) {
      setTwinState({ ...contextState.twin, trainCommand: null }); // Clear previous commands
    }
    setWorkOrders(contextState.workOrders || []);
    setPredictive(contextState.predictive || []);
  }, [contextState]);

  const handleSendPrompt = async () => {
    if (!prompt.trim() || isProcessing) return;
    
    const userMsg = { sender: 'user', text: prompt, timestamp: new Date().toISOString() };
    const newChat = [...(contextState.chatMessages || []), userMsg];
    updateContextState(activeContext.id, { chatMessages: newChat });
    setPrompt('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/context/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId: activeContext.id, prompt })
      });
      const data = await response.json();
      
      const agentMsg = { sender: 'agent', text: data.reply, timestamp: new Date().toISOString() };
      updateContextState(activeContext.id, { 
        chatMessages: [...newChat, agentMsg],
        incidents: data.stateUpdates?.incidents || contextState.incidents,
        twin: { ...contextState.twin, ...data.stateUpdates?.twin }
      });
      
      if (voiceEnabled && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(data.reply);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error(err);
      updateContextState(activeContext.id, { 
        chatMessages: [...newChat, { sender: 'agent', text: 'Sorry, the AI agent is currently offline.' }] 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerEmergency = () => {
    if (!twinState) return;
    const isEmergency = twinState.activeEmergency === 'EngineFire';
    const newState = {
      ...twinState,
      activeEmergency: isEmergency ? null : 'EngineFire',
      activeDashboard: isEmergency ? null : 'Engine',
      trainCommand: isEmergency ? 'resume' : 'emergency'
    };
    updateContextState(activeContext.id, { twin: newState });
    setTwinState(newState);
  };

  const setTrainCommand = (cmd) => {
    if (!twinState) return;
    const newState = { ...twinState, trainCommand: cmd, activeEmergency: cmd === 'emergency' ? 'EngineFire' : null };
    updateContextState(activeContext.id, { twin: newState });
    setTwinState(newState);
  };

  // ── Map Switching (replaces old overrideWeather) ──
  const switchMap = (mapId) => {
    if (!twinState) return;
    const mapConfig = MAP_PRESETS[mapId];
    if (!mapConfig) return;

    const newState = { ...twinState, activeMap: mapId };
    
    // AI notification about map change
    const alertText = `Environment Alert: Switched to **${mapConfig.name}** map.\n\n` +
      `🌡️ Ambient: ${mapConfig.ambientTemp}°C | 👁️ Visibility: ${mapConfig.visibility}% | 💨 Wind: ${mapConfig.windSpeed} km/h\n\n` +
      `${mapConfig.description}`;
    
    const alertMsg = { sender: 'system', text: alertText, timestamp: new Date().toISOString() };
    
    updateContextState(activeContext.id, {
      twin: newState,
      chatMessages: [...(contextState.chatMessages || []), alertMsg]
    });
    setTwinState(newState);
    setShowMapSelector(false);
  };

  // ── Speed Adjustment (+/- 10 km/h) ──
  const adjustSpeed = (delta) => {
    if (!twinState) return;
    const current = twinState.speedDelta || 0;
    const newDelta = Math.max(-80, Math.min(80, current + delta));
    const newState = { ...twinState, speedDelta: newDelta };
    updateContextState(activeContext.id, { twin: newState });
    setTwinState(newState);
  };

  const changeCamera = (view) => {
    if (!twinState) return;
    const newState = { ...twinState, cameraView: view };
    updateContextState(activeContext.id, { twin: newState });
    setTwinState(newState);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  if (!activeContext) return <div style={{ color: 'white', padding: 20 }}>Loading NOC...</div>;

  const accentColor = '#3b82f6';

  const S = {
    // ── Layout ──
    container: {
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#020617', color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: 'hidden'
    },
    // ── Header ──
    header: {
      height: '60px', background: 'rgba(15, 23, 42, 0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 50, backdropFilter: 'blur(12px)'
    },
    headerBtn: {
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
      color: '#cbd5e1', borderRadius: '8px', padding: '6px 12px',
      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
      fontSize: '13px', fontWeight: '500', transition: 'all 0.2s'
    },
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
    // ── KPI Cards ──
    kpiCard: (color) => ({
      background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px',
      display: 'flex', alignItems: 'center', gap: '12px',
      border: '1px solid rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${color}`, transition: 'all 0.2s'
    }),
    kpiIcon: { color: '#64748b', flexShrink: 0 },
    kpiValue: { fontSize: '15px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#f8fafc', lineHeight: 1 },
    kpiLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 },
    // ── Canvas Container ──
    canvasWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
    // ── Floating Dock ──
    dock: {
      position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px',
      padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100,
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
    },
    dockBtn: (isActive) => ({
      width: '40px', height: '40px', borderRadius: '16px',
      background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
      color: isActive ? '#60a5fa' : '#cbd5e1',
      border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      transition: 'all 0.2s', fontSize: '18px'
    }),
    dockDivider: { width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' },
    // ── Floating AI Widget ──
    aiWidget: {
      position: 'absolute', bottom: '90px', right: '32px',
      width: '380px', height: '550px', background: 'rgba(10, 15, 30, 0.95)',
      backdropFilter: 'blur(24px)', border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: '16px', display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(59,130,246,0.1)'
    },
    // ── Notification Center ──
    notifWidget: {
      position: 'absolute', top: '70px', right: '32px',
      width: '320px', background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px', display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden'
    },
    // ── Bottom Drawer ──
    maintDrawer: (show) => ({
      position: 'absolute', bottom: show ? '90px' : '-400px', left: '50%', transform: 'translateX(-50%)',
      width: '600px', height: '300px', background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px', zIndex: 90, transition: 'bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.3)'
    })
  };

  return (
    <div style={S.container}>
      {/* ════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════ */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: '900', fontSize: '18px', letterSpacing: '-1px' }}>V</span>
            </div>
            <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '0.5px', background: 'linear-gradient(90deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Vanguard <span style={{ fontWeight: '300' }}>NOC</span>
            </div>
          </div>
          
          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          
          {/* ── Active Map Badge ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#60a5fa', fontWeight: '600'
          }}>
            <span>{activeMapConfig.icon}</span>
            <span>{activeMapConfig.name}</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>| {activeMapConfig.ambientTemp}°C</span>
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowCompareSelector(!showCompareSelector)} 
              style={{ ...S.headerBtn, background: compareContextId ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)' }}
            >
              <Filter size={14} /> Compare Grid {compareContextId && ' (Active)'}
            </button>
            {showCompareSelector && (
              <div style={{ position: 'absolute', top: '40px', left: 0, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 100, minWidth: '150px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', padding: '4px 8px', fontWeight: 'bold' }}>Compare with:</div>
                {contexts.filter(c => c.id !== activeContext?.id).map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => { toggleCompareContext(c.id); setShowCompareSelector(false); }} 
                    style={{ background: compareContextId === c.id ? 'rgba(59,130,246,0.2)' : 'transparent', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>{c.icon}</span> {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {isSwitching && (
                <div style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                   Syncing...
                </div>
             )}
          </div>
          
          <div style={{ fontSize: '12px', color: '#64748b', fontFamily: "'JetBrains Mono', monospace", fontWeight: '500' }}>
            {currentTime.toLocaleTimeString('en-IN', { hour12: false })}
          </div>

          <button onClick={() => setShowNotifications(!showNotifications)} style={{ ...S.headerBtn, position: 'relative' }}>
            <Bell size={15} />
            {environmentAlerts.length > 0 && <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#f59e0b', borderRadius: '50%' }} />}
          </button>

          <button onClick={toggleVoice} style={{
            ...S.headerBtn,
            background: voiceEnabled ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
            color: voiceEnabled ? '#60a5fa' : '#f87171',
            border: `1px solid ${voiceEnabled ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`
          }} title={voiceEnabled ? 'Voice ON' : 'Voice OFF'}>
            {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

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
                <div style={S.kpiValue}>{activeMapConfig.ambientTemp}<span style={{ fontSize: '11px', color: '#64748b' }}>°C</span></div>
                <div style={S.kpiLabel}>{activeMapConfig.name}</div>
              </div>
            </div>
          </div>

          <div style={S.sidebarSectionTitle}>Train Manager</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {contexts.filter(c => c.type === 'Train' || c.type === 'Freight').map(c => {
               // Map context IDs to train internal IDs to fetch independent speed
               let tId = 'passenger';
               if (c.name.toLowerCase().includes('freight')) tId = 'freight';
               if (c.name.toLowerCase().includes('vande')) tId = 'vandebharat';
               
               const speed = trainSpeeds[tId] || 0;
               const isActive = activeContext?.id === c.id;

               // Determine status text
               let statusText = 'Cruising';
               if (speed === 0) statusText = 'At Station';
               else if (speed > 0 && speed < 30) statusText = 'Accelerating';

               return (
                <div 
                  key={c.id} 
                  style={{ 
                    padding: '10px 12px', background: isActive ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px',
                    transition: 'all 0.2s'
                  }}
                >
                   <div onClick={() => switchContext(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                     <span style={{ fontSize: '16px' }}>{c.icon}</span>
                     <div style={{ flex: 1, overflow: 'hidden' }}>
                       <div style={{ fontSize: '12px', fontWeight: '600', color: isActive ? '#60a5fa' : '#cbd5e1', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{c.name}</div>
                       <div style={{ fontSize: '10px', color: '#64748b' }}>Speed: {speed} km/h • {statusText}</div>
                     </div>
                   </div>
                   
                   {/* Expanded Controls for Active Train */}
                   {isActive && (
                     <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                       {/* Speed controls */}
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                         <button onClick={() => adjustSpeed(-10)} title="Reduce Speed" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>⏪</button>
                         <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", minWidth: '50px', textAlign: 'center' }}>
                           {twinState?.speedDelta > 0 ? '+' : ''}{twinState?.speedDelta || 0}
                         </span>
                         <button onClick={() => adjustSpeed(10)} title="Increase Speed" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>⏩</button>
                       </div>
                       {/* Command controls */}
                       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
                         <button onClick={() => setTrainCommand('start')} title="Start" style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '14px' }}>▶</button>
                         <button onClick={() => setTrainCommand('pause')} title="Pause" style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: '14px' }}>⏸</button>
                         <button onClick={() => setTrainCommand('stop')} title="Stop" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>⏹</button>
                         <button onClick={() => setTrainCommand('emergency')} title="Emergency Stop" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>🚨</button>
                       </div>
                     </div>
                   )}
                </div>
               );
             })}
          </div>
        </div>

        {/* RIGHT AREA (85%) - DIGITAL TWIN VIEWS */}
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {[
            { isPrimary: true, ctx: activeContext, state: contextState, alerts: alertCount },
            ...(compareContextId ? [{ 
              isPrimary: false, 
              ctx: contexts.find(c => c.id === compareContextId), 
              state: compareContextState, 
              alerts: compareContextState?.incidents?.length || 0,
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
                    onEnvironmentChange={NOOP} 
                    restoredState={view.state?.twin}
                    onStateCapture={view.isPrimary ? registerStateCapture : NOOP}
                    contextName={view.ctx.name}
                  />
                  <OrbitControls enableZoom={true} enablePan={true} maxPolarAngle={Math.PI / 2} />
                </Canvas>
              </div>
            </div>
          ))}
        </div>

        {/* ── NOTIFICATION CENTER ── */}
        <AnimatePresence>
          {showNotifications && (
             <motion.div
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               style={S.notifWidget}
             >
               <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold', fontSize: '12px' }}>System Alerts</div>
               <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                 {environmentAlerts.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>No alerts</div>}
                 {environmentAlerts.slice(-5).reverse().map((msg, i) => (
                   <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', gap: '10px' }}>
                     <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, mt: 2 }} />
                     <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{msg.text}</div>
                   </div>
                 ))}
               </div>
             </motion.div>
          )}
        </AnimatePresence>

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
              onClick={() => changeCamera(cam.id)}
              style={S.dockBtn(twinState?.cameraView === cam.id)}
              title={cam.label}
              onMouseEnter={e => { if(twinState?.cameraView !== cam.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}}
              onMouseLeave={e => { if(twinState?.cameraView !== cam.id) e.currentTarget.style.background = 'transparent'}}
            >
              {cam.icon}
            </button>
          ))}

          <div style={S.dockDivider} />

          {/* ── MAP SELECTOR (replaces old weather selector) ── */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMapSelector(!showMapSelector)} style={S.dockBtn(showMapSelector)} title="Select Map"
              onMouseEnter={e => { if(!showMapSelector) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}}
              onMouseLeave={e => { if(!showMapSelector) e.currentTarget.style.background = 'transparent'}}
            >
              <MapIcon size={17} color={showMapSelector ? '#60a5fa' : '#94a3b8'} />
            </button>
            {showMapSelector && (
              <div style={{
                position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '2px',
                minWidth: '200px', backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
              }}>
                <div style={{ fontSize: '10px', color: '#64748b', padding: '4px 10px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Select Railway Map</div>
                {MAP_ORDER.map(mapId => {
                  const mc = MAP_PRESETS[mapId];
                  const isActive = activeMapId === mapId;
                  return (
                    <button
                      key={mapId}
                      onClick={() => switchMap(mapId)}
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                        border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                        color: isActive ? '#60a5fa' : '#cbd5e1',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{mc.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600' }}>{mc.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>{mc.ambientTemp}°C • {mc.weather}</div>
                      </div>
                      {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa' }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={S.dockDivider} />

          {/* Action Controls */}
          <button onClick={triggerEmergency} style={S.dockBtn(twinState?.activeEmergency)} title="Emergency Sim"
            onMouseEnter={e => { if(!twinState?.activeEmergency) e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}}
            onMouseLeave={e => { if(!twinState?.activeEmergency) e.currentTarget.style.background = 'transparent'}}
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

        {/* ── AI ASSISTANT FLOATING WIDGET ── */}
        <AnimatePresence>
          {rightDrawerTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={S.aiWidget}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <Bot size={16} color="#60a5fa" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', letterSpacing: '0.5px' }}>Vanguard AI</div>
                    <div style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Online</div>
                  </div>
                </div>
                <button onClick={() => setRightDrawerTab(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Chat Feed */}
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                      background: msg.sender === 'user' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.05)',
                      border: msg.sender === 'agent' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {msg.sender === 'user' ? <User size={10} color="white" /> : <Bot size={10} color="#94a3b8" />}
                    </div>
                    <div style={{
                      maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
                      background: msg.sender === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                      border: msg.sender === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6'
                    }}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', borderRadius: '0 0 16px 16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendPrompt()}
                    placeholder="Ask AI to analyze infrastructure..."
                    disabled={isProcessing}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '13px', outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button
                    onClick={handleSendPrompt}
                    disabled={isProcessing || !prompt.trim()}
                    style={{
                      background: prompt.trim() && !isProcessing ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                      color: prompt.trim() && !isProcessing ? 'white' : '#64748b',
                      border: 'none', borderRadius: '8px', padding: '0 16px', cursor: prompt.trim() && !isProcessing ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                    }}
                  >
                    {isProcessing ? <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <span style={{ fontSize: '14px' }}>↗</span>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
