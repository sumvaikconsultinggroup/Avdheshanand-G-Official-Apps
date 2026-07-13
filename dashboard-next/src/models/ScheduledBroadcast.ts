import mongoose, { Schema, models, model } from 'mongoose';

export interface IScheduledBroadcast {
  mode: 'push' | 'volunteer_whatsapp';
  payload: Record<string, unknown>;
  scheduledAt: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  result?: Record<string, unknown>;
  error?: string;
  createdByAdminId?: string;
  createdByUsername?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledBroadcastSchema = new Schema<IScheduledBroadcast>(
  {
    mode: { type: String, enum: ['push', 'volunteer_whatsapp'], required: true },
    // The full broadcast body (title/body/audience/cityName/imageUrl/event…).
    payload: { type: Schema.Types.Mixed, default: {} },
    scheduledAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    createdByAdminId: { type: String },
    createdByUsername: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

// Fast lookup for the cron processor: due + still pending.
ScheduledBroadcastSchema.index({ status: 1, scheduledAt: 1 });

const ScheduledBroadcast =
  (models.ScheduledBroadcast as mongoose.Model<IScheduledBroadcast>) ||
  model<IScheduledBroadcast>('ScheduledBroadcast', ScheduledBroadcastSchema);

export default ScheduledBroadcast;
