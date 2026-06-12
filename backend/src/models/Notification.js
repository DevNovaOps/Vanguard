import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: [
          'ComplianceViolation',
          'RiskAlert',
          'IncidentCreated',
          'IncidentEscalated',
          'IncidentClosed',
          'AgentDecision',
          'MitigationCreated',
          'MitigationExecuted',
          'MitigationFailed',
          'SimulationStarted',
          'SimulationCompleted',
          'SystemAlert'
        ],
        message: 'Invalid notification type'
      },
      required: [true, 'Notification type is required'],
      index: true
    },
    severity: {
      type: String,
      enum: {
        values: ['Info', 'Warning', 'High', 'Critical'],
        message: 'Severity must be Info, Warning, High, or Critical'
      },
      required: [true, 'Severity level is required'],
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
          'Mitigation',
          'Simulation',
          'Risk',
          'AutonomousAgent',
          'Webhook'
        ],
        message: 'Module must match standard platform service names'
      },
      required: [true, 'Module origin is required'],
      index: true
    },
    recipientRoles: {
      type: [String],
      default: []
    },
    recipientUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate human-readable NT-XXXXXX identifier
notificationSchema.pre('save', async function (next) {
  if (!this.notificationId) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.notificationId = `NT-${randomNum}`;
  }
  next();
});

// Compound index for optimized querying of a user's notifications
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
