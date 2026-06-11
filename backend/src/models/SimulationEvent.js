import mongoose from 'mongoose';

/**
 * SimulationEvent Model
 * Each step in a simulation run produces one event document.
 */
const simulationEventSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SimulationRun',
      required: [true, 'Simulation Run reference is required'],
      index: true
    },
    stepNumber: {
      type: Number,
      required: [true, 'Step number is required'],
      min: 1,
      max: 9
    },
    stepName: {
      type: String,
      required: [true, 'Step name is required'],
      trim: true
    },
    module: {
      type: String,
      required: [true, 'Module name is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'running', 'completed', 'failed'],
        message: 'Status must be pending, running, completed, or failed'
      },
      default: 'pending'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    duration: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const SimulationEvent = mongoose.models.SimulationEvent || mongoose.model('SimulationEvent', simulationEventSchema);

export default SimulationEvent;
