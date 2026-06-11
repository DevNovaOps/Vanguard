import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api.js';
import { io } from 'socket.io-client';

const SimulationContext = createContext(null);

const SIMULATION_STEPS = [
  { id: 1, name: 'Sensor Anomaly Detected', module: 'telemetry', description: 'Detecting temperature spike on target node sensor array' },
  { id: 2, name: 'Compliance Violation', module: 'compliance', description: 'Evaluating sensor readings against active compliance rules' },
  { id: 3, name: 'Risk Score Calculated', module: 'risk', description: 'Computing weighted risk score and severity classification' },
  { id: 4, name: 'Heap Prioritization', module: 'incidents', description: 'Max Heap recalculation — re-ordering incident priority queue' },
  { id: 5, name: 'Incident Created', module: 'incidents', description: 'Creating or confirming incident record in the database' },
  { id: 6, name: 'AI Agent Activated', module: 'agent', description: 'Autonomous agent evaluating telemetry and deciding mitigation' },
  { id: 7, name: 'Mitigation Executed', module: 'mitigation', description: 'Deploying corrective action on affected infrastructure' },
  { id: 8, name: 'Network Stabilized', module: 'network', description: 'Resolving incidents and restoring normal operations' },
  { id: 9, name: 'Report Generated', module: 'reports', description: 'Compiling final simulation report and audit trail' },
];

export function SimulationProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [events, setEvents] = useState([]);
  const [simulationRunId, setSimulationRunId] = useState(null);
  const [liveStepData, setLiveStepData] = useState({});
  const socketRef = useRef(null);

  const addEvent = useCallback((event) => {
    setEvents(prev => [{ ...event, timestamp: new Date().toISOString(), id: Date.now() + Math.random() }, ...prev].slice(0, 100));
  }, []);

  // Socket.IO connection for real-time simulation updates
  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SIMULATION-SOCKET] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[SIMULATION-SOCKET] Connection error:', err.message);
    });

    socket.on('error', (err) => {
      console.warn('[SIMULATION-SOCKET] Socket error:', err.message);
    });

    // Listen for simulation step events
    socket.on('simulation:step', (data) => {
      console.log('[SIMULATION-SOCKET] Step event:', data);

      if (data.status === 'completed') {
        setCurrentStep(data.stepNumber);
        setCompletedSteps(prev => {
          if (!prev.includes(data.stepNumber)) {
            return [...prev, data.stepNumber];
          }
          return prev;
        });

        // Store step data for the timeline
        setLiveStepData(prev => ({
          ...prev,
          [data.stepNumber]: data
        }));

        // Add to events feed
        const severityMap = {
          telemetry: 'danger',
          compliance: 'danger',
          risk: 'danger',
          incidents: 'warning',
          agent: 'warning',
          mitigation: 'info',
          network: 'success',
          reports: 'success'
        };

        addEvent({
          type: data.module,
          title: data.stepName,
          description: data.description,
          severity: severityMap[data.module] || 'info',
          step: data.stepNumber,
          data: data.data
        });
      } else if (data.status === 'running') {
        setCurrentStep(data.stepNumber);
        addEvent({
          type: data.module,
          title: `${data.stepName} — Processing...`,
          description: data.description,
          severity: 'info',
          step: data.stepNumber
        });
      } else if (data.status === 'failed') {
        addEvent({
          type: data.module,
          title: `${data.stepName} — Failed`,
          description: data.description,
          severity: 'danger',
          step: data.stepNumber
        });
      }
    });

    // Listen for simulation start
    socket.on('simulation:start', (data) => {
      console.log('[SIMULATION-SOCKET] Simulation started:', data);
      setIsRunning(true);
      setCurrentStep(0);
      setCompletedSteps([]);
      setLiveStepData({});
      setSimulationRunId(data.runId);
      addEvent({
        type: 'simulation-start',
        title: 'Failure Simulation Started',
        description: `Initiating 9-step failure cascade on ${data.nodeName} (${data.nodeCode})...`,
        severity: 'info'
      });
    });

    // Listen for simulation complete
    socket.on('simulation:complete', (data) => {
      console.log('[SIMULATION-SOCKET] Simulation completed:', data);
      setIsRunning(false);
      addEvent({
        type: 'simulation-complete',
        title: 'Simulation Complete',
        description: `All 9 steps executed successfully. Run ${data.runId} completed in ${(data.totalDuration / 1000).toFixed(1)}s.`,
        severity: 'success'
      });
    });

    // Listen for simulation failure
    socket.on('simulation:failed', (data) => {
      console.log('[SIMULATION-SOCKET] Simulation failed:', data);
      setIsRunning(false);
      addEvent({
        type: 'simulation-failed',
        title: 'Simulation Failed',
        description: `Simulation ${data.runId} failed: ${data.error}`,
        severity: 'danger'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [addEvent]);

  const startSimulation = useCallback(async () => {
    if (isRunning) return;

    // The Socket.IO events will handle state updates
    // Just trigger the backend
    try {
      await api.post('/api/simulation/trigger', {});
    } catch (err) {
      console.error('[SIMULATION] Failed to trigger simulation:', err);
      addEvent({
        type: 'simulation-error',
        title: 'Simulation Trigger Failed',
        description: err.message || 'Failed to start simulation. Check authentication and permissions.',
        severity: 'danger'
      });
    }
  }, [isRunning, addEvent]);

  const stopSimulation = useCallback(() => {
    // For now, just reset UI state — backend simulation continues but we stop listening
    setIsRunning(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    addEvent({
      type: 'simulation-stop',
      title: 'Simulation Stopped',
      description: 'Simulation display terminated by operator. Backend process may continue.',
      severity: 'warning'
    });
  }, [addEvent]);

  return (
    <SimulationContext.Provider value={{
      isRunning,
      currentStep,
      totalSteps: SIMULATION_STEPS.length,
      completedSteps,
      events,
      liveStepData,
      simulationRunId,
      startSimulation,
      stopSimulation,
      SIMULATION_STEPS,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within SimulationProvider');
  return context;
}

export default SimulationContext;
