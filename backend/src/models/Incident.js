import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: {
      type: String,
      unique: true,
      trim: true,
      index: true
    },
    sensorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sensor',
      required: [true, 'Sensor reference is required'],
      index: true
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransitNode',
      required: [true, 'Transit Node reference is required'],
      index: true
    },
    severity: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Severity must be Low, Medium, High, or Critical'
      },
      required: [true, 'Incident severity is required'],
      index: true
    },
    riskScore: {
      type: Number,
      min: [0, 'Risk score must be at least 0'],
      max: [100, 'Risk score cannot exceed 100'],
      required: [true, 'Risk score is required']
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
        values: ['Open', 'Investigating', 'Mitigated', 'Resolved', 'Closed'],
        message: 'Status must be Open, Investigating, Mitigated, Resolved, or Closed'
      },
      default: 'Open',
      index: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolvedAt: {
      type: Date
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: Generate dynamic incident identifier (e.g. INC-20260609-F3C2)
incidentSchema.pre('save', async function (next) {
  if (!this.incidentNumber) {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
                    (today.getMonth() + 1).toString().padStart(2, '0') +
                    today.getDate().toString().padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.incidentNumber = `INC-${dateStr}-${randomPart}`;
  }
  next();
});

// Prevent duplicate model compilation during development hot-reloads
const Incident = mongoose.models.Incident || mongoose.model('Incident', incidentSchema);

export default Incident;
