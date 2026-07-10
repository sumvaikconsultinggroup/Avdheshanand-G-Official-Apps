import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for the Volunteer model
export interface IVolunteer extends Document {
  fullName: string;
  email: string;
  phone: string;
  location?: string; // Actual field used by the app (city/place text)
  city?: string; // Added city field
  state?: string; // Added state field
  country?: string; // Added country field
  zip?: string; // Added zip field
  maritalStatus?: string;
  gender?: string;
  highestEducation?: string;
  hoursAvailable?: {
    hours: number;
    period: 'day' | 'week' | 'month';
  };
  age: number;
  profile?: string;
  occupationType: string;
  occupation?: string;
  availability: string[];
  availableFrom?: Date;
  availableUntil?: Date;
  skills: string[]; 
  motivation: string;
  experience?: string;
  consent: boolean;
  isApproved: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for the Volunteer model
const VolunteerSchema = new Schema<IVolunteer>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Minimum age is 18 years'],
      max: [100, 'Maximum age is 100 years'],
    },
    location: {
      type: String,
      trim: true,
      required: false,
    },
    city: {
      type: String,
      trim: true,
      required: false,
    },
    state: {
      type: String,
      trim: true,
      required: false,
    },
    country: {
      type: String,
      trim: true,
      required: false,
    },
    zip: {
      type: String,
      trim: true,
      required: false,
    },
    maritalStatus: {
      type: String,
      trim: true,
      required: false,
    },
    gender: {
      type: String,
      trim: true,
      required: false,
    },
    highestEducation: {
      type: String,
      trim: true,
      required: false,
    },
    hoursAvailable: {
      type: {
        hours: {
          type: Number,
          min: [0, 'Hours cannot be negative'],
          required: false,
        },
        period: {
          type: String,
          enum: ['day', 'week', 'month'],
          required: false,
        },
      },
      required: false,
      _id: false,
    },
    profile: {
      type: String,
    },
    occupationType: {
      type: String,
      required: [true, 'Occupation type is required'],
      trim: true,
    },
    occupation: {
      type: String,
      trim: true,
      // Not required by default, we'll validate conditionally
    },
    availability: {
      type: [String],
      required: [true, 'Availability is required'],
    },
    availableFrom: {
      type: Date,
    },
    availableUntil: {
      type: Date,
      validate: {
        validator: function (this: IVolunteer, value: Date) {
          // Only validate if both dates are provided
          if (this.availableFrom && value) {
            return value > this.availableFrom;
          }
          return true;
        },
        message: 'End date must be after start date',
      },
    },
    skills: {
      type: [String],
      required: [true, 'Skills are required'],
    },
    motivation: {
      type: String,
      required: [true, 'Motivation is required'],
      minlength: [50, 'Motivation should be at least 50 characters long'],
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
    },
    consent: {
      type: Boolean,
      required: [true, 'Consent is required'],
      validate: {
        validator: (value: boolean) => value === true,
        message: 'You must provide consent to proceed',
      },
    },
    isApproved: {
      type: Boolean,
      default: false,
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

// Add text index for search functionality
// VolunteerSchema.index({
//   fullName: 'text',
//   email: 'text',
//   location: 'text',
//   occupation: 'text',
//   motivation: 'text',
// });

// Pre-save middleware to validate occupation field based on occupationType
VolunteerSchema.pre('save', function (next) {
  // Validate date range if both dates are present
  if (this.availableFrom && this.availableUntil) {
    if (this.availableUntil <= this.availableFrom) {
      const err = new Error('End date must be after start date');
      return next(err);
    }
  }

  // Validate occupation based on occupationType
  if (
    this.occupationType &&
    this.occupationType !== 'unemployed' &&
    this.occupationType !== 'retired' &&
    this.occupationType !== 'student'
  ) {
    if (!this.occupation || this.occupation.trim() === '') {
      const err = new Error(
        'Occupation is required when occupation type is not unemployed, retired, or student'
      );
      return next(err);
    }
  }

  next();
});

// Fix the "Cannot overwrite model" error by checking if it already exists
const Volunteer: Model<IVolunteer> =
  mongoose.models.Volunteer || mongoose.model<IVolunteer>('Volunteer', VolunteerSchema);

export default Volunteer;
