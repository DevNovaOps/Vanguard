import mongoose from 'mongoose';

const agentActionSchema = new mongoose.Schema(
  {
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Railway node reference is required'],
      index: true
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: false,
      index: true
    },
    telemetryData: {
      temperature: {
        type: Number,
        required: [true, 'Telemetry temperature is required']
      },
      vibration: {
        type: Number,
        required: [true, 'Telemetry vibration is required']
      },
      gas: {
        type: Number,
        required: [true, 'Telemetry gas is required']
      },
      power: {
        type: Number,
        required: [true, 'Telemetry power is required']
      },
      riskScore: {
        type: Number,
        required: [true, 'Telemetry riskScore is required']
      }
    },
    detectedThreat: {
      type: String,
      required: [true, 'Detected threat is required']
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
    decision: {
      type: String,
      required: [true, 'Decision is required']
    },
    confidence: {
      type: Number,
      required: [true, 'Confidence percentage is required'],
      min: 0,
      max: 100
    },
    reasoning: {
      type: String,
      required: [true, 'Decision reasoning description is required']
    },
    status: {
      type: String,
      enum: {
        values: ['success', 'pending', 'failed'],
        message: 'Status must be success, pending, or failed'
      },
      default: 'success',
      index: true
    },
    executedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for retrieval by node and creation time
agentActionSchema.index({ nodeId: 1, createdAt: -1 });
agentActionSchema.index({ createdAt: -1 });

const AgentAction = mongoose.models.AgentAction || mongoose.model('AgentAction', agentActionSchema);

export default AgentAction;
