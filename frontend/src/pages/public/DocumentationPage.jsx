export default function DocumentationPage() {
  return (
    <div className="info-page">
      <h1><span className="gradient-text">API Documentation</span></h1>
      <p>Complete API reference for integrating with the Vanguard ARC platform.</p>

      <h2>Authentication</h2>
      <p>All API requests require a Bearer token in the Authorization header.</p>
      <pre><code>{`POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@vanguardarc.in",
  "password": "your-password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Arjun Mehta",
    "role": "admin"
  }
}`}</code></pre>

      <h2>Telemetry API</h2>
      <p>Retrieve real-time sensor data from the railway network.</p>
      <pre><code>{`GET /api/telemetry/sensors
Authorization: Bearer <token>

Query Parameters:
  nodeId  - Filter by transit node (e.g., TN-001)
  type    - Sensor type (temperature, vibration, pressure, gas, power, signal)
  status  - Filter by status (normal, warning, critical)

Response:
{
  "sensors": [
    {
      "id": "S-001",
      "nodeId": "TN-001",
      "type": "temperature",
      "value": 42.5,
      "unit": "°C",
      "threshold": 65,
      "status": "normal"
    }
  ]
}`}</code></pre>

      <h2>Incidents API</h2>
      <p>Manage and query infrastructure incidents.</p>
      <pre><code>{`GET /api/incidents
POST /api/incidents
PATCH /api/incidents/:id
DELETE /api/incidents/:id

GET /api/incidents?severity=critical&status=active

Response:
{
  "incidents": [
    {
      "id": "INC-2841",
      "severity": "critical",
      "title": "Transformer Overheating",
      "riskScore": 92,
      "status": "active"
    }
  ]
}`}</code></pre>

      <h2>WebSocket Events</h2>
      <p>Real-time events via Socket.IO connection.</p>
      <pre><code>{`// Connect
const socket = io('wss://api.vanguardarc.in');

// Events
socket.on('sensor-update', (data) => { ... });
socket.on('incident-created', (data) => { ... });
socket.on('risk-updated', (data) => { ... });
socket.on('mitigation-triggered', (data) => { ... });
socket.on('agent-action', (data) => { ... });`}</code></pre>

      <h2>Rate Limits</h2>
      <p>API requests are rate-limited to prevent abuse:</p>
      <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
        <li>Standard endpoints: 100 requests/minute</li>
        <li>Telemetry streaming: 1000 requests/minute</li>
        <li>Webhook deliveries: 500 events/minute</li>
      </ul>
    </div>
  );
}
