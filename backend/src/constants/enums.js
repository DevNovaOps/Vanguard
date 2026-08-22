/**
 * Centralized enum constants matching MySQL schema ENUM values.
 * Used across validators, services, and repositories.
 */

export const USER_ROLES = ['Admin', 'Operator', 'SafetyOfficer', 'Manager'];

export const NODE_TYPES = ['Station', 'Junction', 'Depot', 'PowerHub', 'SignalTower'];

export const TRANSIT_NODE_TYPES = ['Station', 'Depot', 'Junction', 'PowerHub'];

export const NODE_STATUSES = ['Active', 'Inactive', 'Maintenance', 'healthy', 'warning', 'critical', 'maintenance'];

export const CONNECTION_STATUSES = ['Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical'];

export const SENSOR_TYPES = ['Temperature', 'Vibration', 'Pressure', 'Gas', 'Humidity', 'Smoke', 'Voltage', 'Current'];

export const SENSOR_STATUSES = ['Online', 'Offline', 'Faulty'];

export const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const INCIDENT_STATUSES = ['Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed'];

export const INCIDENT_SOURCES = ['Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent'];

export const MITIGATION_ACTIONS = [
  'Emergency Brake',
  'Emergency Speed Restriction',
  'Power Rerouting',
  'Route Isolation',
  'Infrastructure Shutdown',
  'Maintenance Dispatch',
  'Ventilation Activation',
  'Safety Escalation'
];

export const MITIGATION_STATUSES = ['Pending', 'InProgress', 'Executed', 'Completed', 'Failed', 'Cancelled'];

export const EXECUTION_SOURCES = ['AI_AGENT', 'OPERATOR', 'SAFETY_OFFICER', 'ADMIN'];

export const AGENT_STATUSES = ['success', 'pending', 'failed'];

export const SIMULATION_RUN_STATUSES = ['Running', 'Completed', 'Failed', 'Cancelled'];

export const SIMULATION_EVENT_STATUSES = ['pending', 'running', 'completed', 'failed'];

export const WEBHOOK_METHODS = ['GET', 'POST', 'PUT', 'PATCH'];

export const WEBHOOK_STATUSES = ['Active', 'Inactive', 'Error'];

export const DELIVERY_STATUSES = ['Success', 'Failed', 'Retrying'];

export const NOTIFICATION_TYPES = [
  'ComplianceViolation', 'RiskAlert', 'IncidentCreated', 'IncidentEscalated',
  'IncidentClosed', 'AgentDecision', 'MitigationCreated', 'MitigationExecuted',
  'MitigationFailed', 'SimulationStarted', 'SimulationCompleted', 'SystemAlert'
];

export const NOTIFICATION_SEVERITIES = ['Info', 'Warning', 'High', 'Critical'];

export const AUDIT_SEVERITIES = ['Info', 'Warning', 'Critical'];

export const AUDIT_MODULES = [
  'Authentication', 'TransitNode', 'Sensor', 'SensorData',
  'Compliance', 'Incident', 'Mitigation', 'Simulation',
  'Risk', 'AutonomousAgent', 'Webhook'
];

export const COMPLIANCE_VIOLATION_STATUSES = ['Open', 'Resolved', 'Investigating'];

export const ROUTE_TIERS = ['major', 'regional', 'local'];

export const ROUTE_STATUSES = ['Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical'];
