import mongoose from 'mongoose';

const mitigationActionSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Incident reference is required'],
      index: true
    },
    actionType: {
      type: String,
      enum: {
        values: [
          'EmergencyBrake',
          'Shutdown',
          'Ventilation',
          'Alert',
          'MaintenanceDispatch',
          'RouteDiversion'
        ],
        message: 'Action type must be EmergencyBrake, Shutdown, Ventilation, Alert, MaintenanceDispatch, or RouteDiversion'
      },
      required: [true, 'Action type is required'],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description of the mitigation action is required'],
      trim: true
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Executing user reference is required'],
      index: true
    },
    executionStatus: {
      type: String,
      enum: {
        values: ['Pending', 'InProgress', 'Completed', 'Failed'],
        message: 'Execution status must be Pending, InProgress, Completed, or Failed'
      },
      default: 'Pending',
      index: true
    },
    executedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate model compilation during development hot-reloads
const MitigationAction = mongoose.models.MitigationAction || mongoose.model('MitigationAction', mitigationActionSchema);

export default MitigationAction;
