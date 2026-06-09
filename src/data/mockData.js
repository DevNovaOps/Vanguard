// ============================================
// VANGUARD ARC — Mock Data
// Comprehensive railway infrastructure dataset
// ============================================

// ── Transit Nodes ──
export const transitNodes = [
  { id: 'TN-001', name: 'New Delhi Junction', type: 'station', zone: 'Northern', lat: 28.6419, lng: 77.2193, status: 'healthy', sensors: 24, lastMaintenance: '2026-05-12', riskScore: 12 },
  { id: 'TN-002', name: 'Mumbai Central', type: 'station', zone: 'Western', lat: 18.9712, lng: 72.8194, status: 'healthy', sensors: 32, lastMaintenance: '2026-05-18', riskScore: 8 },
  { id: 'TN-003', name: 'Chennai Central', type: 'station', zone: 'Southern', lat: 13.0827, lng: 80.2707, status: 'warning', sensors: 18, lastMaintenance: '2026-04-28', riskScore: 45 },
  { id: 'TN-004', name: 'Howrah Junction', type: 'station', zone: 'Eastern', lat: 22.5838, lng: 88.3422, status: 'healthy', sensors: 28, lastMaintenance: '2026-05-20', riskScore: 15 },
  { id: 'TN-005', name: 'Kanpur Junction', type: 'junction', zone: 'Northern', lat: 26.4473, lng: 80.3514, status: 'healthy', sensors: 12, lastMaintenance: '2026-05-08', riskScore: 22 },
  { id: 'TN-006', name: 'Itarsi Junction', type: 'junction', zone: 'Western', lat: 22.6158, lng: 77.7647, status: 'warning', sensors: 10, lastMaintenance: '2026-04-15', riskScore: 55 },
  { id: 'TN-007', name: 'Vijayawada Junction', type: 'junction', zone: 'Southern', lat: 16.5175, lng: 80.6308, status: 'healthy', sensors: 14, lastMaintenance: '2026-05-22', riskScore: 18 },
  { id: 'TN-008', name: 'Kharagpur Depot', type: 'depot', zone: 'Eastern', lat: 22.3333, lng: 87.3167, status: 'healthy', sensors: 8, lastMaintenance: '2026-05-25', riskScore: 10 },
  { id: 'TN-009', name: 'Lucknow NR Depot', type: 'depot', zone: 'Northern', lat: 26.8467, lng: 80.9462, status: 'maintenance', sensors: 6, lastMaintenance: '2026-06-01', riskScore: 5 },
  { id: 'TN-010', name: 'Jhansi Power Hub', type: 'power_hub', zone: 'Central', lat: 25.4484, lng: 78.5685, status: 'healthy', sensors: 16, lastMaintenance: '2026-05-10', riskScore: 20 },
  { id: 'TN-011', name: 'Bhusawal Power Hub', type: 'power_hub', zone: 'Western', lat: 21.0493, lng: 75.7828, status: 'critical', sensors: 14, lastMaintenance: '2026-03-20', riskScore: 82 },
  { id: 'TN-012', name: 'Kazipet Signal Tower', type: 'signal', zone: 'Southern', lat: 17.9804, lng: 79.5373, status: 'healthy', sensors: 8, lastMaintenance: '2026-05-15', riskScore: 14 },
  { id: 'TN-013', name: 'Mathura Junction', type: 'junction', zone: 'Northern', lat: 27.4925, lng: 77.6737, status: 'healthy', sensors: 10, lastMaintenance: '2026-05-28', riskScore: 16 },
  { id: 'TN-014', name: 'Pune Junction', type: 'station', zone: 'Western', lat: 18.5285, lng: 73.8743, status: 'healthy', sensors: 20, lastMaintenance: '2026-05-30', riskScore: 11 },
  { id: 'TN-015', name: 'Secunderabad Junction', type: 'station', zone: 'Southern', lat: 17.4344, lng: 78.5013, status: 'warning', sensors: 22, lastMaintenance: '2026-04-22', riskScore: 48 },
  { id: 'TN-016', name: 'Patna Junction', type: 'station', zone: 'Eastern', lat: 25.6093, lng: 85.1376, status: 'healthy', sensors: 16, lastMaintenance: '2026-05-14', riskScore: 19 },
  { id: 'TN-017', name: 'Nagpur Junction', type: 'station', zone: 'Central', lat: 21.1500, lng: 79.0900, status: 'healthy', sensors: 18, lastMaintenance: '2026-05-16', riskScore: 13 },
  { id: 'TN-018', name: 'Bhopal Junction', type: 'station', zone: 'Central', lat: 23.2689, lng: 77.4124, status: 'healthy', sensors: 15, lastMaintenance: '2026-05-19', riskScore: 17 },
  { id: 'TN-019', name: 'Allahabad Signal', type: 'signal', zone: 'Northern', lat: 25.4259, lng: 81.8463, status: 'healthy', sensors: 6, lastMaintenance: '2026-05-21', riskScore: 9 },
  { id: 'TN-020', name: 'Waltair Maintenance', type: 'maintenance', zone: 'Eastern', lat: 17.7215, lng: 83.3006, status: 'healthy', sensors: 10, lastMaintenance: '2026-05-24', riskScore: 7 },
];

// ── Routes connecting nodes ──
export const routes = [
  { id: 'R-001', from: 'TN-001', to: 'TN-005', name: 'Delhi–Kanpur Corridor', distance: 440, status: 'active', load: 85 },
  { id: 'R-002', from: 'TN-005', to: 'TN-006', name: 'Kanpur–Itarsi Trunk', distance: 610, status: 'active', load: 72 },
  { id: 'R-003', from: 'TN-006', to: 'TN-002', name: 'Itarsi–Mumbai Express', distance: 610, status: 'active', load: 90 },
  { id: 'R-004', from: 'TN-001', to: 'TN-013', name: 'Delhi–Mathura Link', distance: 147, status: 'active', load: 65 },
  { id: 'R-005', from: 'TN-013', to: 'TN-018', name: 'Mathura–Bhopal Route', distance: 580, status: 'active', load: 55 },
  { id: 'R-006', from: 'TN-006', to: 'TN-017', name: 'Itarsi–Nagpur Line', distance: 310, status: 'warning', load: 78 },
  { id: 'R-007', from: 'TN-017', to: 'TN-007', name: 'Nagpur–Vijayawada Trunk', distance: 650, status: 'active', load: 60 },
  { id: 'R-008', from: 'TN-007', to: 'TN-003', name: 'Vijayawada–Chennai Exp', distance: 432, status: 'active', load: 82 },
  { id: 'R-009', from: 'TN-004', to: 'TN-008', name: 'Howrah–Kharagpur Shuttle', distance: 120, status: 'active', load: 70 },
  { id: 'R-010', from: 'TN-002', to: 'TN-014', name: 'Mumbai–Pune Deccan', distance: 192, status: 'active', load: 88 },
  { id: 'R-011', from: 'TN-015', to: 'TN-012', name: 'Secunderabad–Kazipet', distance: 136, status: 'active', load: 45 },
  { id: 'R-012', from: 'TN-004', to: 'TN-016', name: 'Howrah–Patna Main', distance: 538, status: 'active', load: 75 },
];

// ── Sensors ──
export const sensors = [
  { id: 'S-001', nodeId: 'TN-001', type: 'temperature', name: 'Rail Temp Sensor A1', value: 42.5, unit: '°C', threshold: 65, status: 'normal', lastUpdate: '2026-06-07T12:45:00Z' },
  { id: 'S-002', nodeId: 'TN-001', type: 'vibration', name: 'Track Vibration A2', value: 2.3, unit: 'mm/s', threshold: 8.0, status: 'normal', lastUpdate: '2026-06-07T12:45:02Z' },
  { id: 'S-003', nodeId: 'TN-002', type: 'temperature', name: 'Rail Temp Sensor B1', value: 38.7, unit: '°C', threshold: 65, status: 'normal', lastUpdate: '2026-06-07T12:44:58Z' },
  { id: 'S-004', nodeId: 'TN-003', type: 'temperature', name: 'Rail Temp Sensor C1', value: 58.2, unit: '°C', threshold: 65, status: 'warning', lastUpdate: '2026-06-07T12:45:01Z' },
  { id: 'S-005', nodeId: 'TN-003', type: 'vibration', name: 'Track Vibration C2', value: 6.8, unit: 'mm/s', threshold: 8.0, status: 'warning', lastUpdate: '2026-06-07T12:45:03Z' },
  { id: 'S-006', nodeId: 'TN-004', type: 'pressure', name: 'Brake Pressure D1', value: 4.2, unit: 'bar', threshold: 6.0, status: 'normal', lastUpdate: '2026-06-07T12:44:55Z' },
  { id: 'S-007', nodeId: 'TN-005', type: 'gas', name: 'Gas Detection E1', value: 12, unit: 'ppm', threshold: 50, status: 'normal', lastUpdate: '2026-06-07T12:44:50Z' },
  { id: 'S-008', nodeId: 'TN-006', type: 'temperature', name: 'Rail Temp Sensor F1', value: 61.3, unit: '°C', threshold: 65, status: 'warning', lastUpdate: '2026-06-07T12:45:05Z' },
  { id: 'S-009', nodeId: 'TN-006', type: 'power', name: 'Power Monitor F2', value: 22.8, unit: 'kV', threshold: 25.0, status: 'normal', lastUpdate: '2026-06-07T12:44:48Z' },
  { id: 'S-010', nodeId: 'TN-010', type: 'power', name: 'Traction Power J1', value: 24.5, unit: 'kV', threshold: 25.0, status: 'normal', lastUpdate: '2026-06-07T12:44:52Z' },
  { id: 'S-011', nodeId: 'TN-011', type: 'temperature', name: 'Transformer Temp K1', value: 78.4, unit: '°C', threshold: 80, status: 'critical', lastUpdate: '2026-06-07T12:45:07Z' },
  { id: 'S-012', nodeId: 'TN-011', type: 'power', name: 'Grid Output K2', value: 18.2, unit: 'kV', threshold: 25.0, status: 'critical', lastUpdate: '2026-06-07T12:45:08Z' },
  { id: 'S-013', nodeId: 'TN-012', type: 'signal', name: 'Signal Health L1', value: 92, unit: '%', threshold: 85, status: 'normal', lastUpdate: '2026-06-07T12:44:46Z' },
  { id: 'S-014', nodeId: 'TN-014', type: 'vibration', name: 'Platform Vibration N1', value: 1.2, unit: 'mm/s', threshold: 8.0, status: 'normal', lastUpdate: '2026-06-07T12:44:54Z' },
  { id: 'S-015', nodeId: 'TN-015', type: 'temperature', name: 'Switch Heater O1', value: 55.6, unit: '°C', threshold: 65, status: 'warning', lastUpdate: '2026-06-07T12:45:04Z' },
  { id: 'S-016', nodeId: 'TN-001', type: 'gas', name: 'Tunnel Gas A3', value: 8, unit: 'ppm', threshold: 50, status: 'normal', lastUpdate: '2026-06-07T12:44:42Z' },
  { id: 'S-017', nodeId: 'TN-002', type: 'vibration', name: 'Bridge Vibration B2', value: 3.1, unit: 'mm/s', threshold: 8.0, status: 'normal', lastUpdate: '2026-06-07T12:44:44Z' },
  { id: 'S-018', nodeId: 'TN-017', type: 'signal', name: 'Interlocking Status Q1', value: 98, unit: '%', threshold: 85, status: 'normal', lastUpdate: '2026-06-07T12:44:40Z' },
  { id: 'S-019', nodeId: 'TN-004', type: 'temperature', name: 'Rail Temp Sensor D2', value: 44.1, unit: '°C', threshold: 65, status: 'normal', lastUpdate: '2026-06-07T12:44:56Z' },
  { id: 'S-020', nodeId: 'TN-018', type: 'power', name: 'OHE Voltage R1', value: 23.8, unit: 'kV', threshold: 25.0, status: 'normal', lastUpdate: '2026-06-07T12:44:38Z' },
];

// ── Incidents ──
export const incidents = [
  { id: 'INC-2841', severity: 'critical', title: 'Transformer Overheating', asset: 'TN-011', assetName: 'Bhusawal Power Hub', riskScore: 92, status: 'active', assignedTeam: 'Alpha', createdAt: '2026-06-07T10:15:00Z', description: 'Transformer temperature approaching critical limit. Immediate attention required.' },
  { id: 'INC-2842', severity: 'high', title: 'Rail Temperature Anomaly', asset: 'TN-003', assetName: 'Chennai Central', riskScore: 76, status: 'investigating', assignedTeam: 'Beta', createdAt: '2026-06-07T09:30:00Z', description: 'Sustained high rail temperature detected on Platform 3 approach track.' },
  { id: 'INC-2843', severity: 'high', title: 'Switch Point Failure Risk', asset: 'TN-006', assetName: 'Itarsi Junction', riskScore: 71, status: 'active', assignedTeam: 'Alpha', createdAt: '2026-06-07T08:45:00Z', description: 'Switch point mechanism showing irregular vibration patterns.' },
  { id: 'INC-2844', severity: 'medium', title: 'Signal Degradation', asset: 'TN-015', assetName: 'Secunderabad Junction', riskScore: 48, status: 'monitoring', assignedTeam: 'Gamma', createdAt: '2026-06-07T07:20:00Z', description: 'Signal strength fluctuations on approach track signals.' },
  { id: 'INC-2845', severity: 'medium', title: 'Power Fluctuation', asset: 'TN-011', assetName: 'Bhusawal Power Hub', riskScore: 55, status: 'active', assignedTeam: 'Delta', createdAt: '2026-06-07T06:10:00Z', description: 'Intermittent voltage drops in OHE supply.' },
  { id: 'INC-2846', severity: 'low', title: 'Vibration Threshold Approach', asset: 'TN-003', assetName: 'Chennai Central', riskScore: 34, status: 'monitoring', assignedTeam: 'Beta', createdAt: '2026-06-07T05:00:00Z', description: 'Track vibration levels trending upward but within limits.' },
  { id: 'INC-2847', severity: 'low', title: 'Scheduled Maintenance Due', asset: 'TN-006', assetName: 'Itarsi Junction', riskScore: 22, status: 'pending', assignedTeam: 'Gamma', createdAt: '2026-06-06T22:30:00Z', description: 'Regular maintenance window approaching for switch mechanism.' },
  { id: 'INC-2848', severity: 'critical', title: 'Grid Output Below Threshold', asset: 'TN-011', assetName: 'Bhusawal Power Hub', riskScore: 88, status: 'active', assignedTeam: 'Alpha', createdAt: '2026-06-07T11:00:00Z', description: 'Traction power output significantly below rated capacity.' },
];

// ── Compliance Rules ──
export const complianceRules = [
  { id: 'CR-001', code: 'API617-TEMP', name: 'Rail Temperature Limit', authority: 'Railway Safety Standards', threshold: '65°C', category: 'Thermal', status: 'active', violations: 3 },
  { id: 'CR-002', code: 'API617-VIB', name: 'Track Vibration Limit', authority: 'Railway Safety Standards', threshold: '8.0 mm/s', category: 'Structural', status: 'active', violations: 0 },
  { id: 'CR-003', code: 'IEC-61850', name: 'Substation Communication', authority: 'IEC Standards', threshold: '99% uptime', category: 'Communication', status: 'active', violations: 1 },
  { id: 'CR-004', code: 'RDSO-SPEC', name: 'OHE Voltage Range', authority: 'RDSO Specification', threshold: '22-27 kV', category: 'Electrical', status: 'active', violations: 2 },
  { id: 'CR-005', code: 'IS-4660', name: 'Gas Detection Threshold', authority: 'Indian Standards', threshold: '50 ppm', category: 'Safety', status: 'active', violations: 0 },
  { id: 'CR-006', code: 'UIC-714', name: 'Signal Reliability', authority: 'UIC Standards', threshold: '85% health', category: 'Signaling', status: 'active', violations: 1 },
  { id: 'CR-007', code: 'EN-50126', name: 'System RAMS', authority: 'EU Standards', threshold: '99.9% reliability', category: 'Reliability', status: 'active', violations: 0 },
  { id: 'CR-008', code: 'RDSO-BP', name: 'Brake Pressure Limit', authority: 'RDSO Specification', threshold: '6.0 bar', category: 'Mechanical', status: 'active', violations: 0 },
];

// ── Violations ──
export const violations = [
  { id: 'V-001', ruleId: 'CR-001', ruleName: 'Rail Temperature Limit', asset: 'TN-011', assetName: 'Bhusawal Power Hub', value: '78.4°C', threshold: '65°C', severity: 'critical', detectedAt: '2026-06-07T10:12:00Z', status: 'active' },
  { id: 'V-002', ruleId: 'CR-001', ruleName: 'Rail Temperature Limit', asset: 'TN-006', assetName: 'Itarsi Junction', value: '61.3°C', threshold: '65°C', severity: 'warning', detectedAt: '2026-06-07T08:40:00Z', status: 'monitoring' },
  { id: 'V-003', ruleId: 'CR-004', ruleName: 'OHE Voltage Range', asset: 'TN-011', assetName: 'Bhusawal Power Hub', value: '18.2 kV', threshold: '22-27 kV', severity: 'critical', detectedAt: '2026-06-07T11:02:00Z', status: 'active' },
  { id: 'V-004', ruleId: 'CR-006', ruleName: 'Signal Reliability', asset: 'TN-015', assetName: 'Secunderabad Junction', value: '82%', threshold: '85%', severity: 'high', detectedAt: '2026-06-07T07:15:00Z', status: 'investigating' },
  { id: 'V-005', ruleId: 'CR-001', ruleName: 'Rail Temperature Limit', asset: 'TN-003', assetName: 'Chennai Central', value: '58.2°C', threshold: '65°C', severity: 'warning', detectedAt: '2026-06-07T09:25:00Z', status: 'monitoring' },
  { id: 'V-006', ruleId: 'CR-003', ruleName: 'Substation Communication', asset: 'TN-011', assetName: 'Bhusawal Power Hub', value: '94.2%', threshold: '99%', severity: 'high', detectedAt: '2026-06-07T10:30:00Z', status: 'active' },
  { id: 'V-007', ruleId: 'CR-004', ruleName: 'OHE Voltage Range', asset: 'TN-010', assetName: 'Jhansi Power Hub', value: '21.8 kV', threshold: '22-27 kV', severity: 'medium', detectedAt: '2026-06-07T06:50:00Z', status: 'resolved' },
];

// ── Mitigation Actions ──
export const mitigationActions = [
  { id: 'MA-001', type: 'Emergency Speed Restriction', target: 'TN-011', targetName: 'Bhusawal Power Hub', status: 'executed', executedAt: '2026-06-07T10:18:00Z', outcome: 'Speed limit reduced to 30 km/h on affected section', triggeredBy: 'autonomous' },
  { id: 'MA-002', type: 'Power Rerouting', target: 'TN-011', targetName: 'Bhusawal Power Hub', status: 'executed', executedAt: '2026-06-07T11:05:00Z', outcome: 'Power supply rerouted via Jhansi Power Hub', triggeredBy: 'autonomous' },
  { id: 'MA-003', type: 'Maintenance Alert', target: 'TN-006', targetName: 'Itarsi Junction', status: 'pending', executedAt: null, outcome: null, triggeredBy: 'autonomous' },
  { id: 'MA-004', type: 'Notify Operator', target: 'TN-003', targetName: 'Chennai Central', status: 'executed', executedAt: '2026-06-07T09:32:00Z', outcome: 'Notification sent to Zone Operator — Southern', triggeredBy: 'autonomous' },
  { id: 'MA-005', type: 'Route Isolation', target: 'TN-011', targetName: 'Bhusawal Power Hub', status: 'scheduled', executedAt: null, outcome: null, triggeredBy: 'manual' },
  { id: 'MA-006', type: 'Emergency Brake', target: 'TN-003', targetName: 'Chennai Central', status: 'standby', executedAt: null, outcome: null, triggeredBy: 'autonomous' },
];

// ── Audit Logs ──
export const auditLogs = [
  { id: 'AL-001', action: 'Incident Created', user: 'System (AI Agent)', module: 'Incidents', result: 'Success', timestamp: '2026-06-07T11:00:00Z', details: 'INC-2848 created for Bhusawal Power Hub' },
  { id: 'AL-002', action: 'Mitigation Executed', user: 'System (AI Agent)', module: 'Mitigation', result: 'Success', timestamp: '2026-06-07T11:05:00Z', details: 'Power rerouting executed for TN-011' },
  { id: 'AL-003', action: 'Compliance Check', user: 'System (AI Agent)', module: 'Compliance', result: 'Violation', timestamp: '2026-06-07T11:02:00Z', details: 'CR-004 violated at TN-011' },
  { id: 'AL-004', action: 'User Login', user: 'Arjun Mehta', module: 'Authentication', result: 'Success', timestamp: '2026-06-07T08:00:00Z', details: 'Admin login from 10.0.1.42' },
  { id: 'AL-005', action: 'Speed Restriction Applied', user: 'System (AI Agent)', module: 'Mitigation', result: 'Success', timestamp: '2026-06-07T10:18:00Z', details: 'Section near TN-011 restricted to 30 km/h' },
  { id: 'AL-006', action: 'Report Generated', user: 'Sneha Patel', module: 'Reports', result: 'Success', timestamp: '2026-06-07T09:00:00Z', details: 'Weekly compliance report exported' },
  { id: 'AL-007', action: 'Sensor Calibration', user: 'Priya Sharma', module: 'Telemetry', result: 'Success', timestamp: '2026-06-07T07:30:00Z', details: 'Sensor S-011 recalibrated' },
  { id: 'AL-008', action: 'Rule Updated', user: 'Rajesh Kumar', module: 'Compliance', result: 'Success', timestamp: '2026-06-06T16:00:00Z', details: 'CR-001 threshold updated from 70°C to 65°C' },
  { id: 'AL-009', action: 'Node Status Changed', user: 'System', module: 'Infrastructure', result: 'Success', timestamp: '2026-06-07T06:00:00Z', details: 'TN-009 status changed to Maintenance' },
  { id: 'AL-010', action: 'Webhook Fired', user: 'System', module: 'Webhooks', result: 'Success', timestamp: '2026-06-07T10:15:05Z', details: 'incident-created event sent to ops-slack' },
  { id: 'AL-011', action: 'Risk Recalculation', user: 'System (AI Agent)', module: 'Risk Analysis', result: 'Success', timestamp: '2026-06-07T10:14:00Z', details: 'TN-011 risk score updated to 82' },
  { id: 'AL-012', action: 'Agent Decision', user: 'System (AI Agent)', module: 'Autonomous Agent', result: 'Success', timestamp: '2026-06-07T10:16:00Z', details: 'Emergency speed restriction decision for TN-011' },
];

// ── Webhooks ──
export const webhooks = [
  { id: 'WH-001', name: 'Ops Slack Notification', url: 'https://hooks.slack.com/services/T00/B00/xxxx', events: ['incident-created', 'risk-triggered'], status: 'active', successRate: 99.2, avgLatency: 145, lastTriggered: '2026-06-07T11:00:05Z' },
  { id: 'WH-002', name: 'PagerDuty Alert', url: 'https://events.pagerduty.com/v2/enqueue', events: ['incident-created', 'mitigation-triggered'], status: 'active', successRate: 100, avgLatency: 220, lastTriggered: '2026-06-07T11:05:02Z' },
  { id: 'WH-003', name: 'SCADA Integration', url: 'https://scada.internal/api/events', events: ['sensor-update', 'agent-action'], status: 'active', successRate: 97.8, avgLatency: 89, lastTriggered: '2026-06-07T12:45:00Z' },
  { id: 'WH-004', name: 'Analytics Pipeline', url: 'https://analytics.internal/ingest', events: ['sensor-update', 'risk-triggered', 'mitigation-triggered'], status: 'active', successRate: 99.9, avgLatency: 67, lastTriggered: '2026-06-07T12:44:58Z' },
  { id: 'WH-005', name: 'SMS Gateway', url: 'https://sms.provider.com/api/send', events: ['incident-created'], status: 'degraded', successRate: 91.5, avgLatency: 340, lastTriggered: '2026-06-07T10:15:08Z' },
];

// ── Telemetry History (for charts) ──
export function generateTelemetryHistory(hours = 24) {
  const data = [];
  const now = Date.now();
  for (let i = hours * 4; i >= 0; i--) {
    const t = now - i * 15 * 60 * 1000;
    data.push({
      time: new Date(t).toISOString(),
      label: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      temperature: 38 + Math.random() * 15 + (i < 8 ? 15 : 0),
      vibration: 1.5 + Math.random() * 3 + (i < 6 ? 3 : 0),
      pressure: 3.8 + Math.random() * 1.5,
      power: 22 + Math.random() * 3,
      gas: 5 + Math.random() * 12,
      signal: 88 + Math.random() * 12,
    });
  }
  return data;
}

// ── KPI Data ──
export const adminKPIs = [
  { label: 'Total Sensors', value: 284, trend: '+12', trendDir: 'up', color: 'blue', icon: 'Radio' },
  { label: 'Transit Nodes', value: 20, trend: '+2', trendDir: 'up', color: 'teal', icon: 'Network' },
  { label: 'Active Users', value: 47, trend: '+5', trendDir: 'up', color: 'green', icon: 'Users' },
  { label: 'Critical Incidents', value: 3, trend: '+1', trendDir: 'down', color: 'red', icon: 'AlertTriangle' },
  { label: 'System Uptime', value: '99.97%', trend: '+0.02%', trendDir: 'up', color: 'green', icon: 'Activity' },
  { label: 'API Requests', value: '1.2M', trend: '+8%', trendDir: 'up', color: 'blue', icon: 'Zap' },
  { label: 'Compliance Score', value: '94.2%', trend: '-1.8%', trendDir: 'down', color: 'amber', icon: 'Shield' },
  { label: 'Auto Actions', value: 156, trend: '+23', trendDir: 'up', color: 'teal', icon: 'Bot' },
];

export const operatorKPIs = [
  { label: 'Active Sensors', value: 267, trend: '+4', trendDir: 'up', color: 'blue', icon: 'Radio' },
  { label: 'Live Alerts', value: 8, trend: '+2', trendDir: 'down', color: 'amber', icon: 'Bell' },
  { label: 'Current Incidents', value: 5, trend: '+1', trendDir: 'down', color: 'red', icon: 'AlertCircle' },
  { label: 'Network Availability', value: '98.5%', trend: '-0.5%', trendDir: 'down', color: 'teal', icon: 'Wifi' },
  { label: 'Infra Health', value: '91.3%', trend: '+0.7%', trendDir: 'up', color: 'green', icon: 'Heart' },
];

export const safetyKPIs = [
  { label: 'Compliance Score', value: '94.2%', trend: '-1.8%', trendDir: 'down', color: 'amber', icon: 'Shield' },
  { label: 'Active Violations', value: 6, trend: '+2', trendDir: 'down', color: 'red', icon: 'AlertOctagon' },
  { label: 'Critical Risks', value: 2, trend: '+1', trendDir: 'down', color: 'red', icon: 'Flame' },
  { label: 'Emergency Actions', value: 3, trend: '+1', trendDir: 'down', color: 'amber', icon: 'Siren' },
  { label: 'Pending Reviews', value: 4, trend: '0', trendDir: 'up', color: 'blue', icon: 'ClipboardCheck' },
];

export const managerKPIs = [
  { label: 'Infra Health', value: '91.3%', trend: '+0.7%', trendDir: 'up', color: 'green', icon: 'Heart' },
  { label: 'Network Availability', value: '98.5%', trend: '-0.5%', trendDir: 'down', color: 'teal', icon: 'Wifi' },
  { label: 'Downtime Prevented', value: '47.2h', trend: '+8.3h', trendDir: 'up', color: 'blue', icon: 'Clock' },
  { label: 'Predicted Failures', value: 12, trend: '+3', trendDir: 'down', color: 'amber', icon: 'TrendingUp' },
  { label: 'Compliance Score', value: '94.2%', trend: '-1.8%', trendDir: 'down', color: 'amber', icon: 'Shield' },
  { label: 'Cost Savings', value: '₹4.2Cr', trend: '+₹0.8Cr', trendDir: 'up', color: 'green', icon: 'IndianRupee' },
  { label: 'Auto Actions', value: 156, trend: '+23', trendDir: 'up', color: 'teal', icon: 'Bot' },
];

// ── Chart Data ──
export const riskTrendData = Array.from({ length: 30 }, (_, i) => ({
  day: `Jun ${i + 1}`,
  risk: Math.floor(35 + Math.random() * 40 + (i > 25 ? 20 : 0)),
  incidents: Math.floor(Math.random() * 5),
  mitigations: Math.floor(Math.random() * 4),
}));

export const complianceTrendData = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  score: Math.floor(88 + Math.random() * 10),
  violations: Math.floor(Math.random() * 8),
}));

export const systemHealthData = [
  { name: 'Healthy', value: 14, color: '#059669' },
  { name: 'Warning', value: 3, color: '#D97706' },
  { name: 'Critical', value: 1, color: '#DC2626' },
  { name: 'Maintenance', value: 2, color: '#3B82F6' },
];

export const incidentSeverityData = [
  { name: 'Low', value: 2, color: '#059669' },
  { name: 'Medium', value: 2, color: '#D97706' },
  { name: 'High', value: 2, color: '#F97316' },
  { name: 'Critical', value: 2, color: '#DC2626' },
];

export const agentDecisions = [
  { id: 'AD-001', decision: 'Apply Speed Restriction', confidence: 97.2, executionTime: '1.2s', outcome: 'success', asset: 'TN-011', timestamp: '2026-06-07T10:16:00Z' },
  { id: 'AD-002', decision: 'Reroute Power Supply', confidence: 94.8, executionTime: '2.4s', outcome: 'success', asset: 'TN-011', timestamp: '2026-06-07T11:04:00Z' },
  { id: 'AD-003', decision: 'Notify Zone Operator', confidence: 99.1, executionTime: '0.3s', outcome: 'success', asset: 'TN-003', timestamp: '2026-06-07T09:31:00Z' },
  { id: 'AD-004', decision: 'Schedule Maintenance', confidence: 88.5, executionTime: '0.8s', outcome: 'pending', asset: 'TN-006', timestamp: '2026-06-07T08:46:00Z' },
  { id: 'AD-005', decision: 'Escalate to Safety Officer', confidence: 91.3, executionTime: '0.4s', outcome: 'success', asset: 'TN-015', timestamp: '2026-06-07T07:22:00Z' },
];

// ── Webhook Event Logs ──
export const webhookEventLogs = [
  { id: 'WE-001', webhookId: 'WH-001', event: 'incident-created', status: 'success', responseCode: 200, latency: 142, timestamp: '2026-06-07T11:00:05Z' },
  { id: 'WE-002', webhookId: 'WH-002', event: 'incident-created', status: 'success', responseCode: 202, latency: 218, timestamp: '2026-06-07T11:00:06Z' },
  { id: 'WE-003', webhookId: 'WH-003', event: 'sensor-update', status: 'success', responseCode: 200, latency: 85, timestamp: '2026-06-07T12:45:01Z' },
  { id: 'WE-004', webhookId: 'WH-005', event: 'incident-created', status: 'failed', responseCode: 503, latency: 5000, timestamp: '2026-06-07T10:15:08Z' },
  { id: 'WE-005', webhookId: 'WH-004', event: 'risk-triggered', status: 'success', responseCode: 200, latency: 62, timestamp: '2026-06-07T10:14:02Z' },
  { id: 'WE-006', webhookId: 'WH-001', event: 'risk-triggered', status: 'success', responseCode: 200, latency: 138, timestamp: '2026-06-07T10:14:03Z' },
  { id: 'WE-007', webhookId: 'WH-002', event: 'mitigation-triggered', status: 'success', responseCode: 202, latency: 225, timestamp: '2026-06-07T11:05:02Z' },
  { id: 'WE-008', webhookId: 'WH-003', event: 'agent-action', status: 'success', responseCode: 200, latency: 91, timestamp: '2026-06-07T10:16:01Z' },
];
