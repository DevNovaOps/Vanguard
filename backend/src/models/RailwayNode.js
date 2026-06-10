import mongoose from 'mongoose';

const railwayNodeSchema = new mongoose.Schema(
  {
    nodeCode: {
      type: String,
      required: [true, 'Node code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    nodeName: {
      type: String,
      required: [true, 'Node name is required'],
      trim: true
    },
    nodeType: {
      type: String,
      enum: {
        values: ['Station', 'Junction', 'Depot', 'PowerHub', 'SignalTower'],
        message: 'Node type must be Station, Junction, Depot, PowerHub, or SignalTower'
      },
      required: [true, 'Node type is required']
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Maintenance', 'healthy', 'warning', 'critical', 'maintenance'],
        message: 'Status must be Active, Inactive, Maintenance, healthy, warning, critical, or maintenance'
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
const RailwayNode = mongoose.models.RailwayNode || mongoose.model('RailwayNode', railwayNodeSchema);

export default RailwayNode;
