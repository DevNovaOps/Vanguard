# Vanguard ARC — Module 13: Audit Logging System

This document provides a comprehensive guide to the **Audit Logging System** (Module 13) implemented for the Vanguard ARC Railway Intelligence Platform.

---

## 1. Architecture

The Audit Logging System is designed to capture every significant user action, module transition, risk update, autonomous agent decision, and simulation event in an immutable ledger. 

```
User Action / System Event
      ↓
  Controller / Service
      ↓
  Audit Service (logEvent)
      ↓
 ┌────┴────────────────────────┐
 ↓                             ↓
MongoDB Ledger            Socket.IO Server
(Immutable Collection)    (Real-time Streams)
                               ↓
                          ┌────┴────────────────┐
                          ↓                     ↓
                    Audit Logs Page      Admin Dashboard
                    (DataTable + Live)   (Timeline + Counters)
```

### Core Design Principles:
1. **Immutability**: Audit logs cannot be modified or deleted. This is enforced at the database schema level via Mongoose pre-save and pre-remove middleware.
2. **Reliability**: Logging is designed to catch its own errors asynchronously so that logging failures never crash the calling application or disrupt core railway operations.
3. **Real-time Streaming**: Log events are automatically dispatched via WebSocket events to update administrators and operators in real-time.

---

## 2. Database Schema

The database model is defined in [AuditLog.js](file:///d:/FarAway-frontend/FarAway-frontend/backend/src/models/AuditLog.js).

```javascript
{
  auditId: { type: String, unique: true, index: true },
  userId: { type: ObjectId, ref: 'User', index: true, default: null },
  username: { type: String, default: 'System' },
  role: { type: String, default: 'System' },
  action: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  entityType: { type: String, default: null },
  entityId: { type: String, default: null },
  description: { type: String, required: true },
  severity: { type: String, enum: ['Info', 'Warning', 'Critical'], required: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  timestamp: { type: Date, default: Date.now, index: true }
}
```

### Indexes:
- `timestamp` (descending for chronological logs)
- `module` (for module filters)
- `action` (for search/filtering)
- `severity` (for severity classifications)
- `userId` (for user-specific action histories)

---

## 3. API Endpoints

All endpoints are prefixed with `/api/audit` and are restricted to **Admin** and **SafetyOfficer** roles.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/audit` | Retrieves filtered, paginated list of audit logs. Supports `search`, `module`, `severity`, `startDate`, `endDate`. |
| `GET` | `/api/audit/:id` | Retrieves a single audit log by database ID or custom `auditId`. |
| `GET` | `/api/audit/stats` | Aggregates summary statistics for audit activity counts. |
| `GET` | `/api/audit/module/:module` | Filters audit logs by specific module name. |
| `GET` | `/api/audit/severity/:severity` | Filters audit logs by specific severity name. |
| `GET` | `/api/audit/export` | Exports full audit logs ledger. Supplying `format=csv` downloads as a formatted CSV file. |
| `GET` | `/api/dashboard/audit` | Returns statistics specifically structured for the main dashboard (incidents, warning/critical events, auto-actions). |

---

## 4. Socket Events

The system reuses the existing Socket.IO server and emits the following messages on audit creation:

| Event Name | Description | Payload |
|---|---|---|
| `audit:create` | Emitted on every audit log generation. | `{ auditId, module, action, severity, timestamp, user, details, result }` |
| `audit:critical` | Emitted when an event with `Critical` severity is created. | Same as above. |
| `audit:simulation` | Emitted when an event in the `Simulation` module is created. | Same as above. |

---

## 5. Frontend Integration

1. **Audit Logs Page**: Connected dynamically in [AuditLogs.jsx](file:///d:/FarAway-frontend/FarAway-frontend/frontend/src/pages/modules/AuditLogs.jsx):
   - Fetches historical data from `/api/audit`.
   - Filters, search inputs, sorting, and pagination are wired to the API.
   - Real-time updates prepended dynamically on socket events.
2. **Admin Dashboard**: Connected in [AdminDashboard.jsx](file:///d:/FarAway-frontend/FarAway-frontend/frontend/src/pages/dashboards/AdminDashboard.jsx):
   - "Critical Audits" card updates from real-time database aggregates.
   - "Audit Timeline" displays live platform action updates via WebSockets.

---

## 6. Testing Guide

A standalone test suite is located in [auditSystem.test.js](file:///d:/FarAway-frontend/FarAway-frontend/backend/tests/auditSystem.test.js).

### Run Test Suite:
```powershell
# Run from backend directory
node tests/auditSystem.test.js
```
The test suite validates login success/failure logging, compliance breaches, risk calculations, incident lifecycles, agent evaluations, mitigation actions, failure cascades, and database immutability.
