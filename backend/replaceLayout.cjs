const fs = require('fs');

const path = '../frontend/src/pages/modules/CommandCenter.jsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `      {/* ════════════════════════════════════════════
          VIEWS WRAPPER (Split Screen Support)
      ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
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
            {/* KPI BAR */}
            <div style={S.kpiBar}>
              <div style={S.kpiCard('#10b981')}>
                <Shield size={16} style={S.kpiIcon} />
                <div>
                  <div style={S.kpiValue}>98.2<span style={{ fontSize: '11px', color: '#64748b' }}>%</span></div>
                  <div style={S.kpiLabel}>Train Health</div>
                </div>
              </div>
              <div style={S.kpiCard('#3b82f6')}>
                <Activity size={16} style={S.kpiIcon} />
                <div>
                  <div style={S.kpiValue}>97.5<span style={{ fontSize: '11px', color: '#64748b' }}>%</span></div>
                  <div style={S.kpiLabel}>Bridge</div>
                </div>
              </div>
              <div style={S.kpiCard('#10b981')}>
                <Radio size={16} style={S.kpiIcon} />
                <div>
                  <div style={S.kpiValue}>Normal</div>
                  <div style={S.kpiLabel}>Track</div>
                </div>
              </div>
              <div style={S.kpiCard('#f59e0b')}>
                <Zap size={16} style={S.kpiIcon} />
                <div>
                  <div style={S.kpiValue}>25.0<span style={{ fontSize: '11px', color: '#64748b' }}>kV</span></div>
                  <div style={S.kpiLabel}>Power</div>
                </div>
              </div>
              <div style={S.kpiCard(view.alerts > 0 ? '#ef4444' : '#10b981')}>
                <AlertTriangle size={16} style={{ ...S.kpiIcon, color: view.alerts > 0 ? '#f87171' : '#64748b' }} />
                <div>
                  <div style={{ ...S.kpiValue, color: view.alerts > 0 ? '#f87171' : '#f8fafc' }}>{view.alerts}</div>
                  <div style={S.kpiLabel}>Alerts</div>
                </div>
              </div>
              <div style={S.kpiCard('#06b6d4')}>
                <Cloud size={16} style={S.kpiIcon} />
                <div>
                  <div style={S.kpiValue}>32<span style={{ fontSize: '11px', color: '#64748b' }}>°C</span></div>
                  <div style={S.kpiLabel}>Weather</div>
                </div>
              </div>
            </div>

            {/* CANVAS WRAP */}
            <div style={S.canvasWrap}>
              {!view.isPrimary && (
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(59, 130, 246, 0.2)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.5)', color: '#60a5fa', fontSize: '11px', fontWeight: 'bold' }}>
                  COMPARING: {view.ctx.name}
                </div>
              )}
              
              <Canvas
                key={\`digital-twin-\${view.ctx.id}\`}
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
                />
                <OrbitControls enableZoom={true} enablePan={true} maxPolarAngle={Math.PI / 2} />
              </Canvas>
            </div>
          </div>
        ))}

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
              <Tool size={16} color="#60a5fa" />
              <span style={{ fontWeight: '600', color: '#f8fafc', fontSize: '14px', letterSpacing: '0.5px' }}>Maintenance Queue</span>
              <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{workOrders.length}</span>
            </div>
            <button onClick={() => setShowMaintenanceDrawer(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100% - 53px)' }}>
            {workOrders.map((wo, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '8px', borderLeft: \`3px solid \${wo.priority === 'High' ? '#ef4444' : '#f59e0b'}\` }}>
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
                <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
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
`;

const startRegex = /\{\/\* ════════════════════════════════════════════\s*KPI BAR \(56px\)\s*════════════════════════════════════════════ \*\/\}\s*<div style=\{S\.kpiBar\}>/m;
const endRegex = /<\/div>\s*<\/div>\s*\);\s*}\s*$/m;

const startIndex = content.search(startRegex);

// find the exact match for endRegex to replace the whole bottom.
const endIndex = content.length; // we'll just replace to the end.

if (startIndex === -1) {
  console.error("Could not find the target block to replace.", { startIndex });
  process.exit(1);
}

const before = content.slice(0, startIndex);

fs.writeFileSync(path, before + replacement);
console.log('Layout replaced successfully!');
