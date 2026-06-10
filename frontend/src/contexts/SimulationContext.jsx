import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../utils/api.js';

const SimulationContext = createContext(null);

const SIMULATION_STEPS = [
  { id: 1, name: 'Sensor Anomaly Detected', module: 'telemetry', duration: 2000, description: 'Temperature spike detected on Node TN-042 (Gauge Rail Sensor)' },
  { id: 2, name: 'Compliance Violation', module: 'compliance', duration: 1800, description: 'Rule API617-TEMP exceeded: Rail temperature 72°C > threshold 65°C' },
  { id: 3, name: 'Risk Score Increase', module: 'risk', duration: 1500, description: 'Risk score elevated to 87/100 — CRITICAL classification' },
  { id: 4, name: 'Heap Prioritization', module: 'incidents', duration: 1200, description: 'Max Heap re-ordered: INC-2847 promoted to priority position' },
  { id: 5, name: 'Incident Created', module: 'incidents', duration: 1500, description: 'Incident INC-2847 generated — Severity: CRITICAL, Asset: TN-042' },
  { id: 6, name: 'AI Agent Activated', module: 'agent', duration: 2000, description: 'Autonomous agent evaluating mitigation options...' },
  { id: 7, name: 'Mitigation Executed', module: 'mitigation', duration: 1800, description: 'Emergency speed restriction applied on Section 12A-B' },
  { id: 8, name: 'Network Stabilized', module: 'network', duration: 1500, description: 'All affected nodes returning to normal operating parameters' },
  { id: 9, name: 'Report Generated', module: 'reports', duration: 1000, description: 'Incident report IR-2847 compiled and filed automatically' },
];

export function SimulationProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [events, setEvents] = useState([]);
  const timeoutRef = useRef(null);
  const stepRef = useRef(0);

  const addEvent = useCallback((event) => {
    setEvents(prev => [{ ...event, timestamp: new Date().toISOString(), id: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const runStep = useCallback((stepIndex) => {
    if (stepIndex >= SIMULATION_STEPS.length) {
      setIsRunning(false);
      setCurrentStep(0);
      addEvent({ type: 'simulation-complete', title: 'Simulation Complete', description: 'All 9 steps executed successfully. System stabilized.', severity: 'success' });
      return;
    }

    const step = SIMULATION_STEPS[stepIndex];
    stepRef.current = stepIndex;
    setCurrentStep(stepIndex + 1);
    setCompletedSteps(prev => [...prev, step.id]);

    addEvent({
      type: step.module,
      title: step.name,
      description: step.description,
      severity: stepIndex < 5 ? 'danger' : stepIndex < 7 ? 'warning' : 'success',
      step: stepIndex + 1,
    });

    timeoutRef.current = setTimeout(() => {
      runStep(stepIndex + 1);
    }, step.duration);
  }, [addEvent]);

  const startSimulation = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    addEvent({ type: 'simulation-start', title: 'Failure Simulation Started', description: 'Initiating 9-step failure cascade simulation...', severity: 'info' });
    
    // Call backend to trigger database events (persistence & socket emit)
    try {
      await api.post('/api/simulation/trigger', {});
    } catch (err) {
      console.error('[SIMULATION] Failed to trigger backend failure simulation:', err);
    }

    setTimeout(() => runStep(0), 500);
  }, [isRunning, runStep, addEvent]);

  const stopSimulation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsRunning(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    addEvent({ type: 'simulation-stop', title: 'Simulation Stopped', description: 'Simulation manually terminated by operator.', severity: 'warning' });
  }, [addEvent]);

  return (
    <SimulationContext.Provider value={{
      isRunning,
      currentStep,
      totalSteps: SIMULATION_STEPS.length,
      completedSteps,
      events,
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
