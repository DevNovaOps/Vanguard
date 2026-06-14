import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api.js';
import { io } from 'socket.io-client';
import rawNodes from '../data/vanguard_railway_nodes_1200.json';

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

// Maximum wait time for the simulation API call: 5 minutes
const SIMULATION_TIMEOUT_MS = 300000;

export function SimulationProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [events, setEvents] = useState([]);
  const [simulationRunId, setSimulationRunId] = useState(null);
  const [liveStepData, setLiveStepData] = useState({});
  const [simulationStore, setSimulationStore] = useState(null);
  // VANGUARD FIX: Track simulation errors so the UI can display error banners
  const [simulationError, setSimulationError] = useState(null);
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
      setSimulationError(null);
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

      // VANGUARD FIX: Handle both success and failure completion
      if (data.status === 'Failed') {
        setSimulationError(data.error || 'Simulation failed during execution.');
        setCurrentStep(7);
        setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
        addEvent({
          type: 'simulation-failed',
          title: 'Simulation Failed',
          description: `Simulation ${data.runId} failed: ${data.error || 'Unknown error'}`,
          severity: 'danger'
        });
      } else {
        addEvent({
          type: 'simulation-complete',
          title: 'Simulation Complete',
          description: `All steps executed successfully. Run ${data.runId} completed.`,
          severity: 'success'
        });
      }
    });

    // Listen for simulation error event
    socket.on('simulation:error', (data) => {
      console.log('[SIMULATION-SOCKET] Simulation error:', data);
      setSimulationError(data.error || 'Simulation encountered an error.');
      addEvent({
        type: 'simulation-error',
        title: 'Simulation Error',
        description: `Error: ${data.error}`,
        severity: 'danger'
      });
    });

    // Listen for simulation failure (legacy event — kept for backward compatibility)
    socket.on('simulation:failed', (data) => {
      console.log('[SIMULATION-SOCKET] Simulation failed:', data);
      setIsRunning(false);
      setSimulationError(data.error || 'Simulation failed.');
      setCurrentStep(7);
      setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
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

  const startSimulation = useCallback(async (nodeCode, temperature, vibration, gas, power, calculatedRiskScore) => {
    if (isRunning) return;

    const selectedNode = rawNodes.find(n => n.nodeCode === (nodeCode || 'BRC')) || rawNodes[0] || { nodeName: 'Bhusawal Power Hub', nodeCode: 'BSL', nodeType: 'Station' };

    // Safe defaults for telemetry values
    const safeTemp = (temperature !== undefined && temperature !== null) ? Number(temperature) : 135;
    const safeVib = (vibration !== undefined && vibration !== null) ? Number(vibration) : 85;
    const safeGas = (gas !== undefined && gas !== null) ? Number(gas) : 40;
    const safePower = (power !== undefined && power !== null) ? Number(power) : 24;
    const safeRisk = (calculatedRiskScore !== undefined && calculatedRiskScore !== null) ? Number(calculatedRiskScore) : 90;

    const payload = {
      node: {
        name: selectedNode.nodeName,
        code: selectedNode.nodeCode,
        type: selectedNode.nodeType || 'Station'
      },
      temperature: safeTemp,
      vibration: safeVib,
      hazardousGas: safeGas,
      voltage: safePower,
      riskScore: safeRisk
    };

    console.log("SIMULATION REQUEST:", payload);

    try {
      await api.post('/api/simulation/trigger', payload);
    } catch (err) {
      console.error('[SIMULATION] Failed to trigger simulation:', err);
      addEvent({
        type: 'simulation-error',
        title: 'Simulation Trigger Failed',
        description: err.response?.data?.message || err.message || 'Failed to start simulation. Check authentication and permissions.',
        severity: 'danger'
      });
    }
  }, [isRunning, addEvent]);

  const stopSimulation = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    setSimulationError(null);
    addEvent({
      type: 'simulation-stop',
      title: 'Simulation Stopped',
      description: 'Simulation display terminated by operator. Backend process may continue.',
      severity: 'warning'
    });
  }, [addEvent]);

  // Synchronous Failure Simulation executing the 7-agent pipeline
  const runFailureSimulation = useCallback(async (nodeCode, temperature, vibration, gas, power, calculatedRiskScore, navigate) => {
    if (isRunning) return;

    const selectedNode = rawNodes.find(n => n.nodeCode === (nodeCode || 'BRC')) || rawNodes[0] || { nodeName: 'Bhusawal Power Hub', nodeCode: 'BSL', nodeType: 'Station' };

    // Safe defaults for telemetry values
    const safeTemp = (temperature !== undefined && temperature !== null) ? Number(temperature) : 135;
    const safeVib = (vibration !== undefined && vibration !== null) ? Number(vibration) : 85;
    const safeGas = (gas !== undefined && gas !== null) ? Number(gas) : 40;
    const safePower = (power !== undefined && power !== null) ? Number(power) : 24;
    const safeRisk = (calculatedRiskScore !== undefined && calculatedRiskScore !== null) ? Number(calculatedRiskScore) : 90;

    const payload = {
      node: {
        name: selectedNode.nodeName,
        code: selectedNode.nodeCode,
        type: selectedNode.nodeType || 'Station'
      },
      temperature: safeTemp,
      vibration: safeVib,
      hazardousGas: safeGas,
      voltage: safePower,
      riskScore: safeRisk
    };

    console.log("SIMULATION REQUEST:", payload);

    setIsRunning(true);
    setCurrentStep(1);
    setCompletedSteps([]);
    setLiveStepData({});
    setSimulationError(null);
    setEvents([
      {
        id: Date.now(),
        title: 'Running Vanguard Analysis...',
        description: `Executing 7-agent pipeline for Bearing Overheating in Transformer S-011 at ${selectedNode.nodeName} (${selectedNode.nodeCode}).`,
        severity: 'info',
        timestamp: new Date().toISOString()
      }
    ]);

    // Visual step updater — only animate up to step 5, then hold on step 6 ("waiting for agents")
    let step = 1;
    const MAX_VISUAL_STEP = 5;
    const intervalId = setInterval(() => {
      if (step <= MAX_VISUAL_STEP) {
        const currentStepNum = step;
        setCompletedSteps(prev => [...prev, currentStepNum]);
        setLiveStepData(prev => ({
          ...prev,
          [currentStepNum]: {
            description: `${SIMULATION_STEPS[currentStepNum - 1].name} completed.`,
            duration: 1500
          }
        }));

        setEvents(prev => [
          {
            id: Date.now() + Math.random(),
            title: SIMULATION_STEPS[currentStepNum - 1].name,
            description: 'Vanguard multi-agent workflow analyzing data...',
            severity: 'info',
            step: currentStepNum,
            timestamp: new Date().toISOString()
          },
          ...prev
        ]);

        step += 1;
        if (step <= 7) {
          setCurrentStep(step);
        }
      } else if (step === MAX_VISUAL_STEP + 1) {
        // Show step 6 as "processing" — waiting for AI pipeline
        setCurrentStep(6);
        setLiveStepData(prev => ({
          ...prev,
          6: {
            description: 'Executing 7-Agent AI pipeline via local LLM. This takes 2-4 minutes depending on CPU/GPU speed. Please wait...',
            duration: null
          }
        }));
        setEvents(prev => [
          {
            id: Date.now() + Math.random(),
            title: 'Executing 7-Agent AI Pipeline',
            description: 'Waiting for AI agents to complete analysis. This runs 7 diagnostic agents sequentially and takes 2-4 minutes. Please be patient.',
            severity: 'warning',
            step: 6,
            timestamp: new Date().toISOString()
          },
          ...prev
        ]);
        step += 1; // Prevent re-entering this block
      }
      // After step 6, interval keeps running but does nothing until API responds
    }, 2000);

    // Set up a timeout — abort if API takes more than 5 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SIMULATION_TIMEOUT_MS);

    try {
      const response = await api.post('/api/simulation/run', payload, { signal: controller.signal });

      clearTimeout(timeoutId);
      clearInterval(intervalId);

      const payloadResult = response.data || response;

      const store = {
        executive_summary: payloadResult.executive_summary || '',
        root_causes: payloadResult.root_causes || '',
        mitigation_actions: payloadResult.mitigation_actions || '',
        historical_incidents: payloadResult.historical_incidents || '',
        sensor_evidence: payloadResult.sensor_evidence || '',
        retrieval_results: payloadResult.retrieval_results || '',
        rdso_guidance: payloadResult.rdso_guidance || '',
        risk_level: payloadResult.risk_level || 'CRITICAL',
        affected_assets: [
          {
            asset_id: 'S-011',
            asset_type: selectedNode.nodeType || 'Station',
            location: `${selectedNode.nodeName} (${selectedNode.nodeCode})`,
            temperature: safeTemp,
            vibration: safeVib,
            power_deviation: 2.5,
            risk_level: payloadResult.risk_level || 'CRITICAL'
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
          title: 'Simulation Complete ✓',
          description: 'All 7 simulation stages completed and dashboard updated.',
          severity: 'success',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);

      setIsRunning(false);
      setSimulationError(null);

      if (navigate) {
        setTimeout(() => {
          navigate('/risk-analysis');
        }, 1500);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      clearInterval(intervalId);

      const isTimeout = err.name === 'AbortError' || (err.message && err.message.includes('abort'));
      console.error('[SIMULATION] Synchronous run failed:', err);

      // VANGUARD FIX: Properly recover the UI state on failure
      // 1. Stop the running indicator
      setIsRunning(false);

      // 2. Mark ALL steps as completed (the simulation attempted them)
      setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
      setCurrentStep(7);

      // 3. Set error state so the UI can display an error banner
      const errorMessage = isTimeout
        ? 'The AI pipeline took too long to respond (>5 minutes). The simulation timed out.'
        : (err.response?.data?.message || err.message || 'Failure simulation engine encountered an unexpected error.');
      setSimulationError(errorMessage);

      // 4. Update step data to show failure indication on step 6
      setLiveStepData(prev => ({
        ...prev,
        1: prev[1] || { description: 'Failure scenario generated.', duration: 800 },
        2: prev[2] || { description: 'Agent pipeline executed (or failed).', duration: null },
        3: prev[3] || { description: 'Outputs aggregation attempted.', duration: null },
        4: prev[4] || { description: 'Risk calculation attempted.', duration: null },
        5: prev[5] || { description: 'Incident prioritization attempted.', duration: null },
        6: { description: `⚠ Failed: ${errorMessage}`, duration: null },
        7: { description: 'Simulation terminated with errors.', duration: null }
      }));

      // 5. Add error event to the log
      setEvents(prev => [
        {
          id: Date.now() + 9,
          title: isTimeout ? 'Simulation Timed Out' : 'Simulation Failed',
          description: errorMessage,
          severity: 'danger',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    }
  }, [isRunning]);

  // VANGUARD FIX: Reset error state
  const clearSimulationError = useCallback(() => {
    setSimulationError(null);
  }, []);

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
      simulationError,
      setSimulationStore,
      startSimulation,
      stopSimulation,
      runFailureSimulation,
      clearSimulationError,
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
