import mongoose from 'mongoose';

/**
 * SimulationRun Model
 * Tracks each end-to-end failure simulation execution.
 */
const simulationRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['Running', 'Completed', 'Failed', 'Cancelled'],
        message: 'Status must be Running, Completed, Failed, or Cancelled'
      },
      default: 'Running'
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode'
    },
    totalSteps: {
      type: Number,
      default: 9
    },
    completedSteps: {
      type: Number,
      default: 0
    },
    currentStep: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    result: {
      violationsCreated: { type: Number, default: 0 },
      incidentId: { type: String, default: null },
      mitigationId: { type: String, default: null },
      riskScore: { type: Number, default: 0 },
      heapPosition: { type: Number, default: 0 },
      agentDecision: { type: String, default: null }
    },
    errorMessage: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate runId before saving
simulationRunSchema.pre('validate', async function (next) {
  if (!this.runId) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.runId = `SIM-${datePart}-${randomPart}`;
  }
  next();
});

const SimulationRun = mongoose.models.SimulationRun || mongoose.model('SimulationRun', simulationRunSchema);

export default SimulationRun;
