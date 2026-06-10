import mongoose from 'mongoose';

const complianceRuleSchema = new mongoose.Schema(
  {
    ruleName: {
      type: String,
      required: [true, 'Rule name is required'],
      unique: true,
      trim: true
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
    authority: {
      type: String,
      enum: {
        values: ['API617', 'PESO', 'RailwaySafety', 'InternalPolicy'],
        message: 'Authority must be API617, PESO, RailwaySafety, or InternalPolicy'
      },
      required: [true, 'Regulating authority is required'],
      index: true
    },
    minValue: {
      type: Number,
      default: null
    },
    maxValue: {
      type: Number,
      default: null
    },
    severity: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Severity must be Low, Medium, High, or Critical'
      },
      required: [true, 'Severity level is required']
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const ComplianceRule = mongoose.models.ComplianceRule || mongoose.model('ComplianceRule', complianceRuleSchema);

export default ComplianceRule;
