import mongoose, { Document, Schema } from 'mongoose';

interface IMentionedMember {
  memberId?: string;
  name: string;
  username?: string;
}

export interface ISmartNote extends Document {
  title: string;
  body: string;
  tags: string[];
  priority?: 'low' | 'medium' | 'high';
  city?: string;
  assignedToId?: string;
  assignedToName?: string;
  mentionedMembers: IMentionedMember[];
  assignmentStatus: 'unassigned' | 'assigned' | 'auto_assigned' | 'acknowledged' | 'completed';
  linkedSevaTaskId?: string;
  createTask: boolean;
  createdById?: string;
  createdByName?: string;
  assignmentNotifiedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MentionedMemberSchema = new Schema<IMentionedMember>(
  {
    memberId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true },
  },
  { _id: false }
);

const SmartNoteSchema = new Schema<ISmartNote>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      maxlength: [5000, 'Body cannot exceed 5000 characters'],
    },
    tags: {
      type: [String],
      default: [],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    city: {
      type: String,
      trim: true,
    },
    assignedToId: {
      type: String,
      trim: true,
    },
    assignedToName: {
      type: String,
      trim: true,
    },
    mentionedMembers: {
      type: [MentionedMemberSchema],
      default: [],
    },
    assignmentStatus: {
      type: String,
      enum: ['unassigned', 'assigned', 'auto_assigned', 'acknowledged', 'completed'],
      default: 'unassigned',
    },
    linkedSevaTaskId: {
      type: String,
      trim: true,
    },
    createTask: {
      type: Boolean,
      default: true,
    },
    createdById: {
      type: String,
      trim: true,
    },
    createdByName: {
      type: String,
      trim: true,
    },
    assignmentNotifiedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

SmartNoteSchema.index({ assignmentStatus: 1, createdAt: -1 });
SmartNoteSchema.index({ assignedToId: 1, assignmentStatus: 1 });

export default mongoose.models.SmartNote ||
  mongoose.model<ISmartNote>('SmartNote', SmartNoteSchema);
