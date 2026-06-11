import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    username: {
      type: String,
      trim: true,
      default: 'System'
    },
    role: {
      type: String,
      trim: true,
      default: 'System'
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      index: true
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
      index: true
    },
    entityType: {
      type: String,
      trim: true,
      default: null
    },
    entityId: {
      type: String,
      trim: true,
      default: null
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    severity: {
      type: String,
      enum: {
        values: ['Info', 'Warning', 'Critical'],
        message: 'Severity must be Info, Warning, or Critical'
      },
      required: [true, 'Severity is required'],
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null
    },
    userAgent: {
      type: String,
      trim: true,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Immutability Hook: Prevent modifications of existing logs
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be updated'));
  }
  if (!this.auditId) {
    // Generate a unique human-readable audit ID matching the AL-XXXXXX format
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.auditId = `AL-${randomNum}`;
  }
  next();
});

// Prevent deletions at Mongoose layer
const preventDelete = function (next) {
  next(new Error('Audit logs are immutable and cannot be deleted'));
};

auditLogSchema.pre('deleteOne', preventDelete);
auditLogSchema.pre('deleteMany', preventDelete);
auditLogSchema.pre('findOneAndDelete', preventDelete);
auditLogSchema.pre('findOneAndRemove', preventDelete);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
