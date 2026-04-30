import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "inquiry_received"
  | "inquiry_replied"
  | "booking_created"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "property_approved"
  | "property_rejected"
  | "agent_approved"
  | "agent_rejected"
  | "new_message";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type:      { type: String, required: true },
    title:     { type: String, required: true, maxlength: 150 },
    body:      { type: String, required: true, maxlength: 500 },
    link:      { type: String },
    isRead:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);