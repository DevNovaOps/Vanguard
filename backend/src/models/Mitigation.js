import mongoose from 'mongoose';

const mitigationSchema = new mongoose.Schema(
  {
    mitigationId: {
      type: String,
      unique: true,
      trim: true,
      index: true
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Incident reference is required'],
      index: true
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Railway node reference is required'],
      index: true
    },
    action: {
      type: String,
      enum: {
        values: [
          'Emergency Brake',
          'Emergency Speed Restriction',
          'Power Rerouting',
          'Route Isolation',
          'Infrastructure Shutdown',
          'Maintenance Dispatch',
          'Ventilation Activation',
          'Safety Escalation'
        ],
        message: 'Action must be one of the predefined action types'
      },
      required: [true, 'Action type is required'],
      index: true
    },
    type: {
      type: String,
      enum: {
        values: [
          'Emergency Brake',
          'Emergency Speed Restriction',
          'Power Rerouting',
          'Route Isolation',
          'Infrastructure Shutdown',
          'Maintenance Dispatch',
          'Ventilation Activation',
          'Safety Escalation'
        ],
        message: 'Type must be one of the predefined action types'
      },
      required: [true, 'Type is required'],
      index: true
    },
    severity: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Severity must be Low, Medium, High, or Critical'
      },
      required: [true, 'Severity level is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'InProgress', 'Executed', 'Completed', 'Failed', 'Cancelled'],
        message: 'Status must be Pending, InProgress, Executed, Completed, Failed, or Cancelled'
      },
      default: 'Pending',
      required: true,
      index: true
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    executionSource: {
      type: String,
      enum: {
        values: ['AI_AGENT', 'OPERATOR', 'SAFETY_OFFICER', 'ADMIN'],
        message: 'Execution source must be AI_AGENT, OPERATOR, SAFETY_OFFICER, or ADMIN'
      },
      required: [true, 'Execution source is required'],
      index: true
    },
    executionNotes: {
      type: String,
      default: '',
      trim: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    executedAt: {
      type: Date,
      default: null
    },
    agentActionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentAction',
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual properties to match the frontend column requirements
mitigationSchema.virtual('id').get(function () {
  return this.mitigationId;
});

mitigationSchema.virtual('target').get(function () {
  if (this.nodeId && typeof this.nodeId === 'object') {
    return this.nodeId.nodeCode;
  }
  return null;
});

mitigationSchema.virtual('targetName').get(function () {
  if (this.nodeId && typeof this.nodeId === 'object') {
    return this.nodeId.nodeName;
  }
  return 'Unknown Asset';
});

mitigationSchema.virtual('triggeredBy').get(function () {
  return this.executionSource === 'AI_AGENT' ? 'autonomous' : 'manual';
});

mitigationSchema.virtual('outcome').get(function () {
  return this.executionNotes || null;
});

// Pre-save hook: Generate dynamic mitigation identifier (e.g. MIT-20260611-ABCD)
mitigationSchema.pre('save', async function (next) {
  if (!this.mitigationId) {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
                    (today.getMonth() + 1).toString().padStart(2, '0') +
                    today.getDate().toString().padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.mitigationId = `MIT-${dateStr}-${randomPart}`;
  }
  next();
});

// Prevent duplicate model compilation during development hot-reloads
const Mitigation = mongoose.models.Mitigation || mongoose.model('Mitigation', mitigationSchema);

export default Mitigation;
