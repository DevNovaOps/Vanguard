import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Plus, Copy, Archive, Train, MapPin, Wind, Zap, CheckCircle, Clock } from 'lucide-react';
import { useOperationalContext } from '../../contexts/OperationalContext';

export default function ContextSwitcher() {
  const { 
    contexts, activeContext, switchContext, 
    duplicateContext, archiveContext, createContext,
    compareContextId, toggleCompareContext
  } = useOperationalContext();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredContexts = useMemo(() => {
    const lower = search.toLowerCase();
    return contexts.filter(c => c.name.toLowerCase().includes(lower) || c.type.toLowerCase().includes(lower));
  }, [contexts, search]);

  const handleCreate = async () => {
    const name = prompt("Enter new context name:");
    if (!name) return;
    await createContext({ name, type: 'Custom', icon: '⚡', color: '#8b5cf6' });
    setIsOpen(false);
  };

  const S = {
    trigger: {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '4px 10px', borderRadius: '6px',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      cursor: 'pointer', color: '#f8fafc', transition: 'all 0.2s',
      fontWeight: '600', fontSize: '13px'
    },
    dropdown: {
      position: 'absolute', top: '100%', left: 0, marginTop: '8px',
      width: '320px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden', zIndex: 200
    },
    searchWrap: {
      padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: '8px'
    },
    input: {
      flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px', padding: '6px 10px', color: 'white', fontSize: '13px', outline: 'none'
    },
    list: {
      maxHeight: '300px', overflowY: 'auto', padding: '8px'
    },
    item: (isActive) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px', borderRadius: '8px', cursor: 'pointer',
      background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
      border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
      transition: 'all 0.2s', marginBottom: '4px'
    })
  };

  if (!activeContext) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Trigger Button */}
      <button style={S.trigger} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ fontSize: '14px' }}>{activeContext.icon}</span>
        {activeContext.name}
        <ChevronDown size={14} color="#94a3b8" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={S.dropdown}
          >
            {/* Search */}
            <div style={S.searchWrap}>
              <Search size={14} color="#64748b" />
              <input 
                type="text" 
                placeholder="Search contexts... (Ctrl+K)" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={S.input}
                autoFocus
              />
              <button onClick={handleCreate} title="Create New Context" style={{
                background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#60a5fa', width: '28px', height: '28px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
                <Plus size={14} />
              </button>
            </div>

            {/* List */}
            <div style={S.list}>
              {filteredContexts.map(ctx => {
                const isActive = ctx.id === activeContext.id;
                return (
                  <div key={ctx.id} style={S.item(isActive)} onClick={() => { switchContext(ctx.id); setIsOpen(false); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `rgba(255,255,255,0.05)`, border: `1px solid ${ctx.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                        {ctx.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: isActive ? '#f8fafc' : '#cbd5e1' }}>
                          {ctx.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: ctx.color }}>●</span> {ctx.type}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      {!isActive && (
                        <button 
                          onClick={() => { toggleCompareContext(ctx.id); setIsOpen(false); }}
                          title="Compare"
                          style={{ 
                            background: ctx.id === compareContextId ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', 
                            border: `1px solid ${ctx.id === compareContextId ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}`, 
                            color: ctx.id === compareContextId ? '#60a5fa' : '#94a3b8', 
                            cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', 
                            fontWeight: '800', fontSize: '9px', letterSpacing: '1px'
                          }}
                        >
                          VS
                        </button>
                      )}
                      <button 
                        onClick={() => duplicateContext(ctx.id, `${ctx.name} (Copy)`)}
                        title="Duplicate"
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                      >
                        <Copy size={13} />
                      </button>
                      <button 
                        onClick={() => archiveContext(ctx.id)}
                        title="Archive"
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                      >
                        <Archive size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredContexts.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No contexts found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
