import mongoose from 'mongoose';

const transitNodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Transit Node name is required'],
      trim: true
    },
    nodeCode: {
      type: String,
      required: [true, 'Transit Node code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    nodeType: {
      type: String,
      enum: {
        values: ['Station', 'Depot', 'Junction', 'PowerHub'],
        message: 'Transit Node type must be Station, Depot, Junction, or PowerHub'
      },
      required: [true, 'Transit Node type is required']
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
        values: ['Active', 'Inactive', 'Maintenance'],
        message: 'Status must be Active, Inactive, or Maintenance'
      },
      default: 'Active',
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator User reference is required']
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const TransitNode = mongoose.models.TransitNode || mongoose.model('TransitNode', transitNodeSchema);

export default TransitNode;
