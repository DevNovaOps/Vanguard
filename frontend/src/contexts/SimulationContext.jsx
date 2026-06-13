import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api.js';
import { io } from 'socket.io-client';

const SimulationContext = createContext(null);

const SIMULATION_STEPS = [
  { id: 1, name: 'Generating Failure Scenario', module: 'telemetry', description: 'Generating simulated telemetry failure conditions.' },
  { id: 2, name: 'Executing 7-Agent Pipeline', module: 'agent', description: 'Executing multi-agent diagnostics via LangGraph.' },
  { id: 3, name: 'Aggregating Results', module: 'reports', description: 'Aggregating multi-agent outputs and diagnostics.' },
  { id: 4, name: 'Calculating Risk', module: 'risk', description: 'Evaluating risk levels and severity thresholds.' },
  { id: 5, name: 'Prioritizing Incidents', module: 'database', description: 'Storing simulation run metrics and updating incident heap.' },
  { id: 6, name: 'Generating Actions', module: 'incidents', description: 'Creating safety incident reports and mitigation actions.' },
  { id: 7, name: 'Stabilizing System', module: 'network', description: 'Executing safety operations and stabilizing the railway network.' }
];

export function SimulationProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [events, setEvents] = useState([]);
  const [simulationRunId, setSimulationRunId] = useState(null);
  const [liveStepData, setLiveStepData] = useState({});
  const [simulationStore, setSimulationStore] = useState(null);
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

    // Listen for simulation step events (from background 9-step simulation if triggered)
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
          reports: 'success',
          database: 'info'
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
        description: `Initiating failure cascade on ${data.nodeName} (${data.nodeCode})...`,
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
        description: `All steps executed successfully. Run ${data.runId} completed.`,
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
        description: `Simulation failed: ${data.error}`,
        severity: 'danger'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [addEvent]);

  const startSimulation = useCallback(async () => {
    if (isRunning) return;

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

  // Synchronous Failure Simulation executing the 7-agent pipeline
  const runFailureSimulation = useCallback(async (navigate) => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentStep(1);
    setCompletedSteps([]);
    setLiveStepData({});
    setEvents([
      {
        id: Date.now(),
        title: 'Running Vanguard Analysis...',
        description: 'Executing 7-agent pipeline for Bearing Overheating in Transformer S-011 at Bhusawal Power Hub.',
        severity: 'info',
        timestamp: new Date().toISOString()
      }
    ]);

    // Visual step updater helper
    let step = 1;
    const intervalId = setInterval(() => {
      if (step <= 7) {
        setCompletedSteps(prev => [...prev, step]);
        setLiveStepData(prev => ({
          ...prev,
          [step]: {
            description: `${SIMULATION_STEPS[step - 1].name} completed.`,
            duration: 1500
          }
        }));

        setEvents(prev => [
          {
            id: Date.now() + Math.random(),
            title: SIMULATION_STEPS[step - 1].name,
            description: 'Vanguard multi-agent workflow analyzing data...',
            severity: 'info',
            step,
            timestamp: new Date().toISOString()
          },
          ...prev
        ]);

        step += 1;
        if (step <= 7) {
          setCurrentStep(step);
        }
      }
    }, 2000);

    try {
      const response = await api.post('/api/simulation/run', {
        asset_id: 'S-011',
        asset_type: 'Transformer',
        failure_type: 'bearing_overheating',
        location: 'Bhusawal Power Hub'
      });

      clearInterval(intervalId);

      const payload = response.data;

      const store = {
        executive_summary: payload.executive_summary,
        root_causes: payload.root_causes,
        mitigation_actions: payload.mitigation_actions,
        historical_incidents: payload.historical_incidents,
        sensor_evidence: payload.sensor_evidence,
        retrieval_results: payload.retrieval_results,
        rdso_guidance: payload.rdso_guidance,
        risk_level: payload.risk_level || 'CRITICAL',
        affected_assets: [
          {
            asset_id: 'S-011',
            asset_type: 'Transformer',
            location: 'Bhusawal Power Hub',
            temperature: 105,
            vibration: 8.5,
            power_deviation: 2.5,
            risk_level: payload.risk_level || 'CRITICAL'
          }
        ]
      };

      setSimulationStore(store);

      // Set all steps to completed
      setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
      setCurrentStep(7);
      setLiveStepData({
        1: { description: 'Failure scenario generated.', duration: 800 },
        2: { description: '7-Agent pipeline executed.', duration: 1100 },
        3: { description: 'Outputs aggregated.', duration: 750 },
        4: { description: 'Overall risk calculated.', duration: 1400 },
        5: { description: 'Incidents prioritized in Max Heap.', duration: 900 },
        6: { description: 'Corrective actions generated.', duration: 1200 },
        7: { description: 'System stabilized.', duration: 1500 }
      });

      setEvents(prev => [
        {
          id: Date.now() + 8,
          title: 'Simulation Complete',
          description: 'All 7 simulation stages completed and dashboard updated.',
          severity: 'success',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);

      setIsRunning(false);

      if (navigate) {
        setTimeout(() => {
          navigate('/risk-analysis');
        }, 1000);
      }
    } catch (err) {
      clearInterval(intervalId);
      setIsRunning(false);
      console.error('[SIMULATION] Synchronous run failed:', err);
      setEvents(prev => [
        {
          id: Date.now() + 9,
          title: 'Simulation Failed',
          description: err.response?.data?.message || err.message || 'Failure simulation engine encountered an unexpected error.',
          severity: 'danger',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    }
  }, [isRunning]);

  return (
    <SimulationContext.Provider value={{
      isRunning,
      currentStep,
      totalSteps: SIMULATION_STEPS.length,
      completedSteps,
      events,
      liveStepData,
      simulationRunId,
      simulationStore,
      setSimulationStore,
      startSimulation,
      stopSimulation,
      runFailureSimulation,
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
