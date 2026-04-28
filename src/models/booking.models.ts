import mongoose, { Document, Schema } from "mongoose";

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  property:  mongoose.Types.ObjectId;
  buyer:     mongoose.Types.ObjectId;
  agent:     mongoose.Types.ObjectId;
  date:      Date;
  timeSlot:  string;
  status:    "pending" | "confirmed" | "cancelled" | "completed" | "rejected";
  rejectionReason?: string;
  cancelledBy?:     "buyer" | "agent";
  note?:     string;
  agentNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    property: { type: Schema.Types.ObjectId, ref: "Property", required: [true, "Property is required"] },
    buyer:    { type: Schema.Types.ObjectId, ref: "User",     required: [true, "Buyer is required"]    },
    agent:    { type: Schema.Types.ObjectId, ref: "User",     required: [true, "Agent is required"]    },
    date: {
      type: Date,
      required: [true, "Visit date is required"],
      validate: {
        validator: (d: Date) => d > new Date(),
        message: "Visit date must be in the future",
      },
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      enum: [
        "09:00 AM","10:00 AM","11:00 AM","12:00 PM",
        "01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM",
      ],
    },
    status: {
      type: String,
      enum: ["pending","confirmed","cancelled","completed","rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, trim: true, default: null },
    cancelledBy:     { type: String, enum: ["buyer","agent"], default: null },
    note:            { type: String, trim: true, maxlength: 500, default: null },
    agentNote:       { type: String, trim: true, maxlength: 500, default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ buyer: 1, status: 1 });
bookingSchema.index({ agent: 1, status: 1 });
bookingSchema.index({ property: 1 });
bookingSchema.index({ date: 1, agent: 1 });

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;