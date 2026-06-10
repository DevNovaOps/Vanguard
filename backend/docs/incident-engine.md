# Module 8 — Incident Engine Documentation

The Incident Engine converts compliance breaches, risk score threshold violations, and telemetry alerts into real-time, actionable, and prioritized incidents.

## Architecture

The module is structured as part of the MERN stack with a service-oriented architectural pattern:

```
Telemetry/Compliance/Simulation (Anomalies)
       ↓
   Risk Engine / Compliance Service (Checks)
       ↓
  Incident Service (Auto-severity & Duplication Check)
       ↓
  Mongoose / MongoDB (Persistence)
       ↓
  Socket.IO Server (Real-time Broadcasts)
       ↓
  React Frontend (Max Heap Prioritized UI Update)
```

## Data Models

### Incident Schema
Located in [Incident.js](file:///d:/FarAway-frontend/FarAway-frontend/backend/src/models/Incident.js):
* `incidentId`: Unique, custom alphanumeric identifier auto-generated on save (e.g. `INC-YYYYMMDD-XXXX`).
* `nodeId`: Reference ObjectId pointing to the target `RailwayNode`.
* `riskScore`: Computed risk value (0 to 100).
* `severity`: Dynamic classification based on risk score.
* `title`: Title descriptive of the anomaly.
* `description`: Detailed log/reasoning for the incident.
* `status`: Current remediation stage (`Open`, `Investigating`, `Mitigating`, `Resolved`, `Closed`).
* `assignedTeam`: Name of the team handling mitigation (e.g. `Alpha`).
* `source`: Tracing source of the incident (`Telemetry`, `Compliance`, `Simulation`, `Manual`, `Agent`).
* `createdAt` / `updatedAt`: Standard mongoose timestamps.

#### Virtuals
To support the frontend without altering the existing page layouts, three virtual fields are computed dynamically when serializing incidents:
1. `id`: maps directly to `incidentId`.
2. `asset`: maps to populated `nodeId.nodeCode`.
3. `assetName`: maps to populated `nodeId.nodeName`.

---

## Severity Rules

The incident severity is automatically calculated based on the risk score:
* **0 - 30**: `Low` (No incident generated unless manually requested)
* **31 - 60**: `Medium` (Optional incident generation)
* **61 - 80**: `High` (Creates/Updates an active incident)
* **81 - 100**: `Critical` (Creates/Updates an active incident)

---

## API Endpoints

All endpoints require JWT authorization headers (`Authorization: Bearer <Token>`).

| Method | Endpoint | Description | Permitted Roles |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/incidents` | Creates a new incident. Updates the active incident if one already exists for the node. | Admin, SafetyOfficer, Operator |
| **GET** | `/api/incidents` | Lists all incidents in descending chronological order. supports optional queries (`status`, `severity`, `nodeId`, `source`). | Admin, SafetyOfficer, Operator, Manager |
| **GET** | `/api/incidents/open` | Lists all active/open incidents. | Admin, SafetyOfficer, Operator, Manager |
| **GET** | `/api/incidents/critical` | Lists all critical severity incidents. | Admin, SafetyOfficer, Operator, Manager |
| **GET** | `/api/incidents/:id` | Fetches details of a single incident by ObjectId or incidentId. | Admin, SafetyOfficer, Operator, Manager |
| **PATCH** | `/api/incidents/:id` | Updates fields. Re-evaluates severity if `riskScore` changes. | Admin, SafetyOfficer, Operator |
| **PATCH** | `/api/incidents/:id/assign` | Assigns a team to the incident. Request body: `{ "assignedTeam": "Alpha" }`. | Admin, SafetyOfficer, Operator |
| **PATCH** | `/api/incidents/:id/resolve` | Resolves the incident (status = `'Resolved'`). | Admin, SafetyOfficer, Operator |
| **PATCH** | `/api/incidents/:id/close` | Closes the incident (status = `'Closed'`). | Admin, SafetyOfficer, Operator |
| **GET** | `/api/dashboard/incidents` | Aggregates stats: total count, open count, critical count, resolved count. | Admin, SafetyOfficer, Operator, Manager |
| **POST** | `/api/simulation/trigger` | Triggers a mock telemetry fail cascade, seeding compliance violations and a critical simulation incident. | Admin, SafetyOfficer, Operator |

---

## Socket.IO Events

Websocket events are emitted from the backend immediately following database writes:

* `incident:create`: Fired when a new incident is logged in the database.
* `incident:update`: Fired when incident properties (risk score, description, or assigned team) are updated.
* `incident:resolve`: Fired when status transitions to `Resolved`.
* `incident:close`: Fired when status transitions to `Closed`.

### Payload Format:
```json
{
  "incidentId": "INC-20260610-ABCD",
  "nodeId": "BRC",
  "riskScore": 87,
  "severity": "Critical",
  "status": "Open"
}
```

---

## Testing Guide

A standalone test runner script is located in `backend/tests/incidentEngine.test.js`. It executes assertion verifications for calculations, duplicates, status transitions, and data integrity.

To execute tests:
```bash
cd backend
node tests/incidentEngine.test.js
```
