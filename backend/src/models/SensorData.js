import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema(
  {
    sensorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sensor',
      required: [true, 'Sensor reference is required'],
      index: true
    },
    value: {
      type: Number,
      required: [true, 'Sensor measurement value is required']
    },
    riskScore: {
      type: Number,
      min: [0, 'Risk score must be at least 0'],
      max: [100, 'Risk score cannot exceed 100'],
      default: 0
    },
    isViolation: {
      type: Boolean,
      default: false,
      index: true
    },
    readingTime: {
      type: Date,
      default: Date.now,
      required: [true, 'Reading timestamp is required'],
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for optimizing telemetry queries (fetching latest values for a sensor)
sensorDataSchema.index({ sensorId: 1, readingTime: -1 });

// Prevent duplicate model compilation during development hot-reloads
const SensorData = mongoose.models.SensorData || mongoose.model('SensorData', sensorDataSchema);

export default SensorData;
