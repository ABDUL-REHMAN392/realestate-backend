import mongoose, { Document, Schema } from "mongoose";

// =============================================
// Agent Profile Interface
// =============================================
export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId; // ref: User

  // ── Application status ──────────────────────
  applicationStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string; // Admin fills this when rejecting

  // ── Documents (Cloudinary URLs) ─────────────
  passportPhoto?: string;
  passportPhotoPublicId?: string;
  cnicFront?: string;
  cnicFrontPublicId?: string;
  cnicBack?: string;
  cnicBackPublicId?: string;
  utilityBill?: string;
  utilityBillPublicId?: string;

  // ── Profile info ────────────────────────────
  bio: string;
  experience: number;
  licenseNumber: string; // auto-generated — GF-YYYY-NNNNN
  agencyName?: string;
  city: string;
  specializations: string[];
  languages: string[];
  whatsapp?: string;
  website?: string;

  // ── Admin flag (set when applicationStatus=approved) ─
  isVerified: boolean;

  // ── Stats (auto-calculated) ─────────────────
  avgRating: number;
  totalReviews: number;
  responseRate: number;
  avgResponseTime: number;
  totalListings: number;

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

    // ── Application status ─────────────────────
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Documents ──────────────────────────────
    passportPhoto:          { type: String, default: null },
    passportPhotoPublicId:  { type: String, select: false, default: null },
    cnicFront:              { type: String, default: null },
    cnicFrontPublicId:      { type: String, select: false, default: null },
    cnicBack:               { type: String, default: null },
    cnicBackPublicId:       { type: String, select: false, default: null },
    utilityBill:            { type: String, default: null },
    utilityBillPublicId:    { type: String, select: false, default: null },

    // ── Profile ────────────────────────────────
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
    agencyName: { type: String, trim: true, default: null },
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
    whatsapp: { type: String, trim: true, default: null },
    website:  { type: String, trim: true, default: null },

    // Admin controls this — synced with applicationStatus
    isVerified: { type: Boolean, default: false },

    // Auto-calculated
    avgRating:       { type: Number, default: 0, min: 0, max: 5 },
    totalReviews:    { type: Number, default: 0 },
    responseRate:    { type: Number, default: 0, min: 0, max: 100 },
    avgResponseTime: { type: Number, default: 0 },
    totalListings:   { type: Number, default: 0 },
  },
  { timestamps: true },
);

// =============================================
// Indexes
// =============================================
agentSchema.index({ city: 1 });
agentSchema.index({ isVerified: 1 });
agentSchema.index({ applicationStatus: 1 });
agentSchema.index({ avgRating: -1 });
agentSchema.index({ city: 1, isVerified: 1, avgRating: -1 });

const Agent = mongoose.model<IAgent>("Agent", agentSchema);
export default Agent;
