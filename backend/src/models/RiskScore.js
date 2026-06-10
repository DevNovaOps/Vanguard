import mongoose from 'mongoose';

const riskScoreSchema = new mongoose.Schema(
  {
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Railway node reference is required'],
      unique: true,
      index: true
    },
    thermalRisk: {
      type: Number,
      required: true,
      default: 0
    },
    electricalRisk: {
      type: Number,
      required: true,
      default: 0
    },
    structuralRisk: {
      type: Number,
      required: true,
      default: 0
    },
    mechanicalRisk: {
      type: Number,
      required: true,
      default: 0
    },
    signalingRisk: {
      type: Number,
      required: true,
      default: 0
    },
    totalRisk: {
      type: Number,
      required: true,
      default: 0
    },
    riskLevel: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Risk level must be Low, Medium, High, or Critical'
      },
      required: true,
      default: 'Low',
      index: true
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const RiskScore = mongoose.models.RiskScore || mongoose.model('RiskScore', riskScoreSchema);

export default RiskScore;
