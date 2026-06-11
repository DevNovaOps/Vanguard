import mongoose from 'mongoose';

const webhookSchema = new mongoose.Schema(
  {
    webhookId: {
      type: String,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    endpoint: {
      type: String,
      required: [true, 'Webhook endpoint URL is required'],
      trim: true
    },
    method: {
      type: String,
      required: [true, 'HTTP Method is required'],
      enum: {
        values: ['GET', 'POST', 'PUT', 'PATCH'],
        message: 'Method must be GET, POST, PUT, or PATCH'
      },
      default: 'POST'
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    subscribedEvents: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Error'],
        message: 'Status must be Active, Inactive, or Error'
      },
      default: 'Active',
      index: true
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    successfulRequests: {
      type: Number,
      default: 0
    },
    failedRequests: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 100
    },
    averageLatency: {
      type: Number,
      default: 0
    },
    lastTriggeredAt: {
      type: Date,
      default: null
    },
    lastResponseCode: {
      type: Number,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property mappings for frontend compatibility
webhookSchema.virtual('id').get(function () {
  return this.webhookId;
});

webhookSchema.virtual('url').get(function () {
  return this.endpoint;
});

// Pre-save hook: Generate unique webhookId
webhookSchema.pre('save', function (next) {
  if (!this.webhookId) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.webhookId = `WH-${randomNum}`;
  }
  next();
});

const Webhook = mongoose.models.Webhook || mongoose.model('Webhook', webhookSchema);

export default Webhook;
