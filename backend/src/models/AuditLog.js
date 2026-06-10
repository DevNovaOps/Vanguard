import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    module: {
      type: String,
      enum: {
        values: [
          'Authentication',
          'TransitNode',
          'Sensor',
          'SensorData',
          'Compliance',
          'Incident',
          'Mitigation'
        ],
        message: 'Module must be Authentication, TransitNode, Sensor, SensorData, Compliance, Incident, or Mitigation'
      },
      required: [true, 'Audited module name is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Audited action verb/name is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Audit log description is required'],
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
