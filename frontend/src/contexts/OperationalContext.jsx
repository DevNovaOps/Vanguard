import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const OperationalContext = createContext();

export function OperationalContextProvider({ children }) {
  const { user } = useAuth();
  
  const [contexts, setContexts] = useState([]);
  const [activeContext, setActiveContext] = useState(null);
  
  // The single source of truth for ephemeral context state
  const [contextState, setContextState] = useState(null);
  
  // ── Comparison State ──
  const [compareContextId, setCompareContextId] = useState(null);
  const [compareContextState, setCompareContextState] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // In-memory cache: Map<contextId, stateSnapshot>
  const cacheRef = useRef(new Map());
  // Save debouncer
  const saveTimeoutRef = useRef(null);
  
  // Function to provide to child components (CommandCenter, DigitalTwinProvider)
  // so they can pass their current ephemeral state back to us before a switch
  const stateCaptureFns = useRef([]);

  const registerStateCapture = useCallback((fn) => {
    stateCaptureFns.current.push(fn);
    return () => {
      stateCaptureFns.current = stateCaptureFns.current.filter(f => f !== fn);
    };
  }, []);

  // Fetch all contexts on mount
  useEffect(() => {
    if (!user) return;
    
    const init = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/api/v1/contexts');
        if (res.success && res.data.length > 0) {
          setContexts(res.data);
          
          // Select from localStorage, default, or first
          const savedId = localStorage.getItem('vanguard_active_context');
          let targetCtx = res.data.find(c => c.id === Number(savedId));
          if (!targetCtx) {
            targetCtx = res.data.find(c => c.is_pinned) || res.data[0];
          }
          await loadContextSnapshot(targetCtx);
        }
      } catch (err) {
        console.error('Failed to load contexts', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [user]);

  // Save snapshot to DB debounced
  const debouncedSave = useCallback((contextId, stateToSave) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/v1/contexts/${contextId}/snapshot`, stateToSave);
      } catch (err) {
        console.error('Failed to save context snapshot', err);
      }
    }, 2000);
  }, []);

  const captureCurrentState = useCallback(() => {
    let captured = { ...contextState };
    stateCaptureFns.current.forEach(fn => {
      const partial = fn();
      if (partial) captured = { ...captured, ...partial };
    });
    return captured;
  }, [contextState]);

  const loadContextSnapshot = async (ctx) => {
    // 1. Capture current before switching
    if (activeContext && contextState) {
      const currentFullState = captureCurrentState();
      cacheRef.current.set(activeContext.id, currentFullState);
      debouncedSave(activeContext.id, currentFullState); // fire and forget
    }

    setActiveContext(ctx);
    localStorage.setItem('vanguard_active_context', ctx.id.toString());
    
    // Auto-close compare mode on primary context switch
    if (compareContextId) {
      setCompareContextId(null);
      setCompareContextState(null);
    }
    
    // 2. Try cache first
    if (cacheRef.current.has(ctx.id)) {
      setContextState(cacheRef.current.get(ctx.id));
      return;
    }
    
    // 3. Fallback to API
    try {
      const res = await api.get(`/api/v1/contexts/${ctx.id}/snapshot`);
      if (res.success) {
        setContextState(res.data);
        cacheRef.current.set(ctx.id, res.data);
      }
    } catch (err) {
      console.error('Failed to load context snapshot', err);
    }
  };

  const switchContext = async (id) => {
    if (activeContext?.id === id) return;
    setIsSwitching(true);
    
    const targetCtx = contexts.find(c => c.id === id);
    if (targetCtx) {
      await loadContextSnapshot(targetCtx);
    }
    
    setTimeout(() => setIsSwitching(false), 200); // UI shimmer duration
  };

  const toggleCompareContext = async (id) => {
    if (compareContextId === id) {
      // Toggle off
      setCompareContextId(null);
      setCompareContextState(null);
      return;
    }
    
    setCompareContextId(id);
    
    // Check cache
    if (cacheRef.current.has(id)) {
      setCompareContextState(cacheRef.current.get(id));
      return;
    }
    
    try {
      const res = await api.get(`/api/v1/contexts/${id}/snapshot`);
      if (res.success) {
        setCompareContextState(res.data);
        cacheRef.current.set(id, res.data);
      }
    } catch (err) {
      console.error('Failed to load compare context snapshot', err);
    }
  };

  const updateContextState = useCallback((partialState) => {
    setContextState(prev => {
      const next = { ...prev, ...partialState };
      
      // Update cache immediately so captureCurrentState has latest if we switch fast
      if (activeContext) {
        cacheRef.current.set(activeContext.id, next);
        debouncedSave(activeContext.id, next);
      }
      return next;
    });
  }, [activeContext, debouncedSave]);

  const createContext = async (data) => {
    const res = await api.post('/api/v1/contexts', data);
    if (res.success) {
      setContexts(prev => [res.data, ...prev]);
      await switchContext(res.data.id);
    }
    return res;
  };

  const duplicateContext = async (id, name) => {
    const res = await api.post(`/api/v1/contexts/${id}/duplicate`, { name });
    if (res.success) {
      setContexts(prev => [res.data, ...prev]);
      await switchContext(res.data.id);
    }
    return res;
  };

  const archiveContext = async (id) => {
    const res = await api.delete(`/api/v1/contexts/${id}`);
    if (res.success) {
      setContexts(prev => prev.filter(c => c.id !== id));
      if (activeContext?.id === id) {
        const remaining = contexts.filter(c => c.id !== id);
        if (remaining.length > 0) await loadContextSnapshot(remaining[0]);
        else {
            setActiveContext(null);
            setContextState(null);
        }
      }
    }
    return res;
  };

  // Provide X-Context-Id header interceptor
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function(resource, config = {}) {
      if (activeContext && resource.toString().startsWith('/api')) {
        config.headers = {
          ...config.headers,
          'X-Context-Id': activeContext.id.toString()
        };
      }
      return originalFetch(resource, config);
    };
    
    return () => { window.fetch = originalFetch; };
  }, [activeContext]);


  const value = {
    contexts,
    activeContext,
    contextState,
    updateContextState,
    switchContext,
    createContext,
    duplicateContext,
    archiveContext,
    isLoading,
    isSwitching,
    registerStateCapture,
    compareContextId,
    compareContextState,
    toggleCompareContext
  };

  return (
    <OperationalContext.Provider value={value}>
      {children}
    </OperationalContext.Provider>
  );
}

export function useOperationalContext() {
  const context = useContext(OperationalContext);
  if (!context) {
    throw new Error('useOperationalContext must be used within an OperationalContextProvider');
  }
  return context;
}
