import mongoose from 'mongoose';

const complianceViolationSchema = new mongoose.Schema(
  {
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ComplianceRule',
      required: [true, 'Compliance rule reference is required'],
      index: true
    },
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RailwayNode',
      required: [true, 'Railway node reference is required'],
      index: true
    },
    sensorType: {
      type: String,
      enum: {
        values: [
          'Temperature',
          'Vibration',
          'Pressure',
          'Gas',
          'Humidity',
          'Smoke',
          'Voltage',
          'Current'
        ],
        message: 'Sensor type must be one of: Temperature, Vibration, Pressure, Gas, Humidity, Smoke, Voltage, Current'
      },
      required: [true, 'Sensor type is required'],
      index: true
    },
    actualValue: {
      type: Number,
      required: [true, 'Actual value is required']
    },
    expectedValue: {
      type: Number,
      required: [true, 'Expected threshold value is required']
    },
    severity: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Severity must be Low, Medium, High, or Critical'
      },
      required: [true, 'Severity level is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['Open', 'Resolved', 'Investigating'],
        message: 'Status must be Open, Resolved, or Investigating'
      },
      default: 'Open',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries on node status
complianceViolationSchema.index({ nodeId: 1, status: 1 });
complianceViolationSchema.index({ createdAt: -1 });

// Prevent duplicate model compilation during development hot-reloads
const ComplianceViolation = mongoose.models.ComplianceViolation || mongoose.model('ComplianceViolation', complianceViolationSchema);

export default ComplianceViolation;
