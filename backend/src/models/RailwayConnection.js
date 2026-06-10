import mongoose from 'mongoose';

const railwayConnectionSchema = new mongoose.Schema(
  {
    sourceNode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Source node reference is required']
    },
    targetNode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Target node reference is required']
    },
    distance: {
      type: Number,
      required: [true, 'Distance is required'],
      min: [0, 'Distance must be a positive number']
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical'],
        message: 'Status must be Active, Inactive, Maintenance, active, warning, or critical'
      },
      default: 'Active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate connections between the same pair of nodes
railwayConnectionSchema.index({ sourceNode: 1, targetNode: 1 }, { unique: true });

// Prevent duplicate model compilation during development hot-reloads
const RailwayConnection = mongoose.models.RailwayConnection || mongoose.model('RailwayConnection', railwayConnectionSchema);

export default RailwayConnection;
