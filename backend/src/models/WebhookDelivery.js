import mongoose from 'mongoose';

const webhookDeliverySchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      unique: true,
      index: true
    },
    webhookId: {
      type: String,
      required: [true, 'Webhook ID is required'],
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Payload content is required']
    },
    responseCode: {
      type: Number,
      default: null
    },
    responseBody: {
      type: String,
      default: ''
    },
    latency: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: {
        values: ['Success', 'Failed', 'Retrying'],
        message: 'Status must be Success, Failed, or Retrying'
      },
      required: [true, 'Delivery status is required']
    },
    retryCount: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property mappings for frontend compatibility
webhookDeliverySchema.virtual('id').get(function () {
  return this.deliveryId;
});

// Pre-save hook: Generate unique deliveryId (e.g., WE-123456)
webhookDeliverySchema.pre('save', function (next) {
  if (!this.deliveryId) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.deliveryId = `WE-${randomNum}`;
  }
  next();
});

const WebhookDelivery = mongoose.models.WebhookDelivery || mongoose.model('WebhookDelivery', webhookDeliverySchema);

export default WebhookDelivery;
