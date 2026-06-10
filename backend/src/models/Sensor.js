import mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema(
  {
    sensorName: {
      type: String,
      required: [true, 'Sensor name is required'],
      trim: true
    },
    sensorCode: {
      type: String,
      required: [true, 'Sensor code is required'],
      unique: true,
      trim: true,
      uppercase: true,
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
    nodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransitNode',
      required: [true, 'Transit Node reference is required'],
      index: true
    },
    threshold: {
      type: Number,
      required: [true, 'Alert threshold value is required']
    },
    unit: {
      type: String,
      required: [true, 'Measurement unit is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['Online', 'Offline', 'Faulty'],
        message: 'Status must be Online, Offline, or Faulty'
      },
      default: 'Online',
      index: true
    },
    installationDate: {
      type: Date,
      default: Date.now
    },
    lastCalibrationDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const Sensor = mongoose.models.Sensor || mongoose.model('Sensor', sensorSchema);

export default Sensor;
