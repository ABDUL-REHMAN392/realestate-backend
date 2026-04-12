import mongoose, { Document, Schema } from "mongoose";

// =============================================
// IInquiry
// Buyer sends inquiry about a property to the agent
// =============================================
export interface IInquiry extends Document {
  _id: mongoose.Types.ObjectId;
  property: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId; // buyer
  agent: mongoose.Types.ObjectId; // property owner (agent)
  message: string;
  phone?: string;
  status: "pending" | "replied" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<IInquiry>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property reference is required"],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Agent reference is required"],
    },
    message: {
      type: String,
      required: [true, "Inquiry message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "replied", "closed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

inquirySchema.index({ property: 1 });
inquirySchema.index({ sender: 1 });
inquirySchema.index({ agent: 1, status: 1 });
inquirySchema.index({ createdAt: -1 });
export const Inquiry = mongoose.model<IInquiry>("Inquiry", inquirySchema);
