import mongoose from 'mongoose';

/**
 * SimulationResult Model
 * Saves the details and output of every 7-agent Vanguard simulation.
 */
const simulationResultSchema = new mongoose.Schema(
  {
    simulation_id: {
      type: String,
      unique: true,
      index: true
    },
    asset_id: {
      type: String,
      required: true
    },
    asset_type: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    failure_type: {
      type: String,
      required: true
    },
    query: {
      type: String,
      required: true
    },
    retrieval_results: {
      type: String,
      default: ''
    },
    sensor_evidence: {
      type: String,
      default: ''
    },
    historical_incidents: {
      type: String,
      default: ''
    },
    rdso_guidance: {
      type: String,
      default: ''
    },
    root_causes: {
      type: String,
      default: ''
    },
    mitigation_actions: {
      type: String,
      default: ''
    },
    executive_summary: {
      type: String,
      default: ''
    },
    risk_level: {
      type: String,
      default: 'LOW'
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate simulation_id before saving
simulationResultSchema.pre('validate', async function (next) {
  if (!this.simulation_id) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.simulation_id = `SIM-${datePart}-${randomPart}`;
  }
  next();
});

const SimulationResult = mongoose.models.SimulationResult || mongoose.model('SimulationResult', simulationResultSchema);

export default SimulationResult;
