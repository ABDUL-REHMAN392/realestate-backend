import mongoose, { Document, Schema } from "mongoose";

// =============================================
// Agent Profile Interface
// =============================================
export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId; // ref: User
  bio: string;
  experience: number; // years
  licenseNumber: string;
  agencyName?: string;
  city: string;
  specializations: string[]; // ["DHA", "Bahria", "Gulberg"]
  languages: string[]; // ["Urdu", "English"]
  whatsapp?: string;
  website?: string;
  isVerified: boolean; // admin approves
  avgRating: number;
  totalReviews: number;
  responseRate: number; // 0-100 percent
  avgResponseTime: number; // minutes
  totalListings: number; // cached count
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true, 
    },
    bio: {
      type: String,
      required: [true, "Bio is required"],
      trim: true,
      minlength: [20, "Bio must be at least 20 characters"],
      maxlength: [1000, "Bio cannot exceed 1000 characters"],
    },
    experience: {
      type: Number,
      required: [true, "Years of experience is required"],
      min: [0, "Experience cannot be negative"],
      max: [70, "Experience seems too high"],
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      trim: true,
      unique: true,
    },
    agencyName: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    specializations: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: "Cannot exceed 10 specializations",
      },
    },
    languages: {
      type: [String],
      default: ["English"],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: "Cannot exceed 10 languages",
      },
    },
    whatsapp: {
      type: String,
      trim: true,
      default: null,
    },
    website: {
      type: String,
      trim: true,
      default: null,
    },

    // Admin controls this
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Auto-calculated fields
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0, min: 0, max: 100 },
    avgResponseTime: { type: Number, default: 0 }, // minutes
    totalListings: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// =============================================
// Indexes
// =============================================
agentSchema.index({ city: 1 });
agentSchema.index({ isVerified: 1 });
agentSchema.index({ avgRating: -1 });
agentSchema.index({ city: 1, isVerified: 1, avgRating: -1 });

const Agent = mongoose.model<IAgent>("Agent", agentSchema);
export default Agent;
