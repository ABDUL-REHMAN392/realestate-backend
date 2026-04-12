import mongoose, { Document, Schema } from "mongoose";

export interface IPriceAlert extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  city: string;
  purpose: "sale" | "rent";
  type?: "house" | "apartment" | "plot" | "commercial" | "villa";
  maxPrice: number;
  minBedrooms?: number;
  isActive: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const priceAlertSchema = new Schema<IPriceAlert>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    city: {
      type: String,
      required: [true, "City is required for a price alert"],
      trim: true,
    },
    purpose: {
      type: String,
      enum: ["sale", "rent"],
      required: [true, "Purpose (sale/rent) is required"],
    },
    type: {
      type: String,
      enum: ["house", "apartment", "plot", "commercial", "villa"],
      default: undefined,
    },
    maxPrice: {
      type: Number,
      required: [true, "Maximum price is required"],
      min: [0, "Max price cannot be negative"],
    },
    minBedrooms: {
      type: Number,
      min: [0, "Bedrooms cannot be negative"],
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggeredAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true },
);

priceAlertSchema.index({ user: 1 });
priceAlertSchema.index({ isActive: 1, city: 1, purpose: 1 });

const PriceAlert = mongoose.model<IPriceAlert>("PriceAlert", priceAlertSchema);
export default PriceAlert;
