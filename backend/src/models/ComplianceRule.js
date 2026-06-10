import mongoose from 'mongoose';

const complianceRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: [true, 'Rule code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    standard: {
      type: String,
      required: [true, 'Standard is required'],
      trim: true,
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
