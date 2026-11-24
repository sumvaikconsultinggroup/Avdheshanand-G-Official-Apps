import mongoose, { Document, Schema, Model } from "mongoose";

// Interface for a single Event document
export interface IEvent extends Document {
  eventName: string;
  eventDate: Date;
  eventLocation: string;
  description: string;
  eventImage: string;
  publicationStatus: "draft" | "published";
  registeredUsers: mongoose.Types.ObjectId[];
  isDeleted: boolean;  // New field
  createdAt: Date;
  updatedAt: Date;
}

// Event Schema
const eventSchema: Schema<IEvent> = new Schema(
  {
    eventName: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      maxlength: [100, "Event name can't exceed 100 characters"],
    },
    eventDate: {
      type: Date,
      required: [true, "Event date is required"],
      index: true,
      default: Date.now,
    },
    eventLocation: {
      type: String,
      required: [true, "Event location is required"],
      trim: true,
      maxlength: [200, "Event location can't exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      maxlength: [500, "Event description can't exceed 500 characters"],
    },
    eventImage: {
      type: String,
      required: [true, "Event image is required"],
      trim: true,
    },
    publicationStatus: { type: String, enum: ["draft", "published"], default: "published" },
    registeredUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false, // Default value is false
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// Compound index to prevent duplicate events with the same name and date
eventSchema.index({ eventName: 1, eventDate: 1 }, { unique: true });

// Check for existing model to avoid re-compilation in dev
const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>("Event", eventSchema);

export default Event;
