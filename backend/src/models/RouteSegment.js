import mongoose from 'mongoose';

const routeSegmentSchema = new mongoose.Schema(
  {
    routeCode: {
      type: String,
      required: [true, 'Route code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true
    },
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
    coordinates: {
      type: [[Number]], // Array of [lat, lng]
      required: [true, 'Coordinates are required']
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical'],
        message: 'Status must be Active, Inactive, Maintenance, active, warning, or critical'
      },
      default: 'Active',
      index: true
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const RouteSegment = mongoose.models.RouteSegment || mongoose.model('RouteSegment', routeSegmentSchema);

export default RouteSegment;
