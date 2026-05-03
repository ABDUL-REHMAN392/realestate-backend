import mongoose, { Document, Schema } from "mongoose";

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants:  mongoose.Types.ObjectId[];
  property:      mongoose.Types.ObjectId | null;
  lastMessage:   mongoose.Types.ObjectId | null;
  lastMessageAt: Date;
  unreadCount:   Map<string, number>;
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
    property:      { type: Schema.Types.ObjectId, ref: "Property", default: null },
    lastMessage:   { type: Schema.Types.ObjectId, ref: "Message",  default: null },
    lastMessageAt: { type: Date, default: () => new Date() },
    unreadCount:   { type: Map, of: Number, default: () => new Map<string, number>() },
  },
  { timestamps: true },
);
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ participants: 1, property: 1 }, { unique: true });
export const Conversation = mongoose.model<IConversation>("Conversation", conversationSchema);

export interface IMessageFile {
  url:      string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: "image" | "document" | "other";
}

export interface IMessage extends Document {
  _id:          mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  sender:       mongoose.Types.ObjectId;
  text?:        string;
  file?:        IMessageFile;
  messageType:  "text" | "image" | "file";
  isRead:       boolean;
  readAt:       Date | null;
  isEdited:     boolean;
  editedAt:     Date | null;
  // ✅ delete
  isDeleted:    boolean;
  // ✅ Reply feature
  replyTo:      mongoose.Types.ObjectId | null;
  createdAt:    Date;
  updatedAt:    Date;
}

const messageFileSchema = new Schema<IMessageFile>(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    fileType: { type: String, enum: ["image","document","other"], required: true },
  },
  { _id: false },
);

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
    text:        { type: String, trim: true, maxlength: [2000, "Message cannot exceed 2000 characters"], default: null },
    file:        { type: messageFileSchema, default: null },
    messageType: { type: String, enum: ["text","image","file"], default: "text" },
    isRead:      { type: Boolean, default: false },
    readAt:      { type: Date,    default: null  },
    isEdited:    { type: Boolean, default: false },
    editedAt:    { type: Date,    default: null  },
    // ✅ NEW: soft delete — WhatsApp style
    isDeleted:   { type: Boolean, default: false },
    // ✅ NEW: reply to another message
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ conversation: 1, isRead: 1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);