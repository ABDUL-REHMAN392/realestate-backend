import mongoose, { Document, Schema } from "mongoose";

// =============================================
// IConversation
// Buyer aur Agent ke beech ka thread
// Property optional — general baat bhi ho sakti hai
// =============================================
export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[]; // exactly 2 — [userId, userId]
  property: mongoose.Types.ObjectId | null; // kis property ke baare mein
  lastMessage: mongoose.Types.ObjectId | null;
  lastMessageAt: Date;
  unreadCount: Map<string, number>; // { "userId": count }
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (arr: mongoose.Types.ObjectId[]) => arr.length === 2,
        message: "Conversation must have exactly 2 participants",
      },
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: () => new Date(),
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: () => new Map<string, number>(),
    },
  },
  { timestamps: true },
);

// =============================================
// Indexes
// =============================================
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ participants: 1, property: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema,
);

// =============================================
// IMessage
// =============================================
export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  isRead: boolean;
  readAt: Date | null;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation reference is required"],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      minlength: [1, "Message cannot be empty"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// =============================================
// Indexes
// =============================================
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ conversation: 1, isRead: 1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);
