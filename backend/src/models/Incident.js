import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      unique: true,
      trim: true,
      index: true
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Railway Node reference is required'],
      index: true
    },
    riskScore: {
      type: Number,
      required: [true, 'Risk score is required'],
      min: [0, 'Risk score must be at least 0'],
      max: [100, 'Risk score cannot exceed 100']
    },
    severity: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Severity must be Low, Medium, High, or Critical'
      },
      required: [true, 'Severity is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed'],
        message: 'Status must be Open, Investigating, Mitigating, Resolved, or Closed'
      },
      default: 'Open',
      index: true
    },
    assignedTeam: {
      type: String,
      default: null
    },
    source: {
      type: String,
      enum: {
        values: ['Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent'],
        message: 'Source must be Telemetry, Compliance, Simulation, Manual, or Agent'
      },
      required: [true, 'Source type is required'],
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
incidentSchema.virtual('id').get(function () {
  return this.incidentId;
});

incidentSchema.virtual('asset').get(function () {
  if (this.nodeId && typeof this.nodeId === 'object') {
    return this.nodeId.nodeCode;
  }
  return null;
});

incidentSchema.virtual('assetName').get(function () {
  if (this.nodeId && typeof this.nodeId === 'object') {
    return this.nodeId.nodeName;
  }
  return 'Unknown Asset';
});

// Pre-save hook: Generate dynamic incident identifier (e.g. INC-20260609-F3C2)
incidentSchema.pre('save', async function (next) {
  if (!this.incidentId) {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
                    (today.getMonth() + 1).toString().padStart(2, '0') +
                    today.getDate().toString().padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.incidentId = `INC-${dateStr}-${randomPart}`;
  }
  next();
});

// Prevent duplicate model compilation during development hot-reloads
const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);

export default Incident;
