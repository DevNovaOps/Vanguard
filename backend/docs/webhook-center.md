# Vanguard ARC — Module 14: Webhook Center

This document provides a comprehensive guide to the **Webhook Center** (Module 14) implemented for the Vanguard ARC Railway Intelligence Platform.

---

## 1. Architecture

The Webhook Center is designed to dispatch real-time HTTP alerts (webhooks) to third-party endpoints (e.g., Slack, PagerDuty, SCADA, Teams) when system events occur across the Vanguard ARC platform.

```
                  Vanguard ARC System Events
     (Compliance, Risk, Incidents, AI Agent, Mitigation, Simulation)
                               ↓
                        Webhook Service
                               ↓
                 ┌─────────────┴─────────────┐
                 ↓                           ↓
          Active Webhooks?              Audit Log Ledger
                 ↓                           ↓
      Async HTTP / Mock Dispatches     Socket.IO Streams
                 ↓
      Retry Loop (up to 3 times)
     (Exponential Backoff: 2s, 4s, 6s)
                 ↓
         Delivery Log Ledger
```

### Core Design Principles:
1. **Event Topic Registry**: Centralized mapping of 14 key platform events.
2. **Asynchronous Non-Blocking Dispatch**: Webhooks are fired asynchronously to prevent delivery latencies from impacting main system performance.
3. **Resilience & Automatic Retries**: Failed deliveries automatically trigger up to 3 retries using exponential backoff (2s, 4s, and 6s delays).
4. **Mock Simulation Mode**: Speeds up development and integration testing by intercepting mock domains (`slack.com`, `pagerduty.com`, `scada.internal`, `email.internal`, `teams.microsoft`) and generating deterministic responses, including simulating failures (`?mockResponse=fail`) and timeouts (`?mockResponse=timeout`).

---

## 2. Database Schema

The Webhook Center utilizes two Mongoose schemas:

### A. Webhook Target Configuration Schema ([Webhook.js](file:///d:/FarAway-frontend/FarAway-frontend/backend/src/models/Webhook.js))
Stores registered integration endpoints.
```javascript
{
  webhookId: { type: String, unique: true, index: true }, // WH-XXXXXX format
  name: { type: String, required: true },
  description: { type: String, default: '' },
  endpoint: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH'], default: 'POST' },
  headers: { type: Schema.Types.Mixed, default: {} },
  subscribedEvents: [{ type: String }],
  isActive: { type: Boolean, default: true, index: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Error'], default: 'Active', index: true },
  
  // Rolling Aggregated Metrics
  totalRequests: { type: Number, default: 0 },
  successfulRequests: { type: Number, default: 0 },
  failedRequests: { type: Number, default: 0 },
  successRate: { type: Number, default: 100 },
  averageLatency: { type: Number, default: 0 },
  lastTriggeredAt: { type: Date, default: null },
  lastResponseCode: { type: Number, default: null },
  createdBy: { type: ObjectId, ref: 'User', default: null }
}
```

### B. Webhook Event Delivery Log Schema ([WebhookDelivery.js](file:///d:/FarAway-frontend/FarAway-frontend/backend/src/models/WebhookDelivery.js))
Maintains history of all attempted HTTP request transactions.
```javascript
{
  deliveryId: { type: String, unique: true, index: true }, // WE-XXXXXX format
  webhookId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  responseCode: { type: Number, default: null },
  responseBody: { type: String, default: '' },
  latency: { type: Number, default: 0 },
  status: { type: String, enum: ['Success', 'Failed', 'Retrying'], required: true, index: true },
  retryCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true }
}
```

---

## 3. Supported Event Types

The centralized registry (`EVENT_REGISTRY`) supports the following topics:

| Event Topic | Description | Source Module |
|---|---|---|
| `AUTH_LOGIN` | User successfully authenticated into the system | Authentication (Module 1) |
| `AUTH_LOGOUT` | User logged out of the system | Authentication (Module 1) |
| `COMPLIANCE_VIOLATION` | Parameter breached compliance rule limits | Compliance Engine (Module 6) |
| `RISK_THRESHOLD_EXCEEDED` | Node risk score exceeded system threshold limits | Risk Engine (Module 7) |
| `RISK_LEVEL_CHANGED` | Node safety score rating shifted (e.g. Critical, Warning, Healthy) | Risk Engine (Module 7) |
| `INCIDENT_CREATED` | New railway incident generated | Incident Engine (Module 8) |
| `INCIDENT_UPDATED` | Incident metadata or severity updated | Incident Engine (Module 8) |
| `INCIDENT_RESOLVED` | Incident safety risk mitigated and resolved | Incident Engine (Module 8) |
| `INCIDENT_CLOSED` | Incident closed by operations officer | Incident Engine (Module 8) |
| `AGENT_ACTION_EXECUTED` | AI Agent made and executed a mitigation command | Autonomous Agent (Module 10) |
| `MITIGATION_EXECUTED` | Mitigation plan dispatched to physical nodes | Mitigation Center (Module 11) |
| `SIMULATION_STARTED` | Failure cascade simulation run initiated | Failure Simulation (Module 12) |
| `SIMULATION_COMPLETED` | Simulation completed and network stabilized | Failure Simulation (Module 12) |
| `AUDIT_CRITICAL` | Immutable critical audit event logged | Audit System (Module 13) |

---

## 4. API Endpoints

All webhook routes are authenticated and require appropriate roles.

| Method | Endpoint | RBAC Role | Description |
|---|---|---|---|
| `GET` | `/api/webhooks` | All Roles | Lists all configured webhooks |
| `GET` | `/api/webhooks/:id` | All Roles | Details of a single webhook by ID |
| `GET` | `/api/webhooks/stats` | All Roles | General statistics (active count, success rate, avg latency) |
| `GET` | `/api/webhooks/deliveries` | All Roles | Paginated and filtered dispatch log history |
| `POST` | `/api/webhooks` | Admin | Register a new webhook target |
| `PATCH` | `/api/webhooks/:id` | Admin | Update configuration for a webhook |
| `DELETE` | `/api/webhooks/:id` | Admin | Remove a webhook and delete all its delivery logs |
| `POST` | `/api/webhooks/:id/test` | Admin | Dispatch a manual mock test payload to target |
| `POST` | `/api/webhooks/:id/activate` | Admin | Toggles webhook status to Active |
| `POST` | `/api/webhooks/:id/deactivate` | Admin | Toggles webhook status to Inactive |
| `POST` | `/api/webhooks/deliveries/:deliveryId/retry` | Admin | Manually retry a failed delivery |
| `GET` | `/api/dashboard/webhooks` | All Roles | Fetches statistics and mapped configurations specifically for the main Admin Dashboard panel |

---

## 5. WebSockets Integration

Uses existing Socket.IO connection to broadcast state changes instantly:
- `webhook:create` / `webhook:update`: Fired when webhooks are configured.
- `webhook:delivery`: Dispatched on every delivery attempt, containing delivery details to update dashboard feeds and transaction logs immediately.
- `webhook:success` / `webhook:failed`: Dedicated event metrics triggers.

---

## 6. Testing & Simulation Guide

An automated test suite validates the system's reliability and error retry paths.

### Executing Tests:
```powershell
# Run from backend directory
node tests/webhookCenter.test.js
```

### Mocking Failure Scenarios:
To verify third-party failure flows without affecting real endpoints:
1. Set the URL endpoint to use a mock domain (e.g. `https://pagerduty.com/alert-pipeline`).
2. Add query parameters to test specific behaviors:
   - `?mockResponse=fail`: Triggers a 500 error response.
   - `?mockResponse=timeout`: Triggers a connection abort/timeout (5000ms delay).
   - Unspecified: Returns a standard 200/202 success response.
