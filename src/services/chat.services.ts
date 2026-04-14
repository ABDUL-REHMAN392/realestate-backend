import mongoose from "mongoose";
import {
  Conversation,
  IConversation,
  Message,
  IMessage,
} from "../models/message.models";
import { AppError } from "../utils/errorHandler";
import { PaginationResult } from "../types";

// =============================================
// GET OR CREATE CONVERSATION
// =============================================
export const getOrCreateConversation = async (
  userId: string,
  otherUserId: string,
  propertyId?: string,
): Promise<IConversation> => {
  if (userId === otherUserId) {
    throw new AppError("You cannot start a conversation with yourself", 400);
  }

  if (propertyId && !mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new AppError("Invalid property ID", 400);
  }

  const sorted = [userId, otherUserId].sort();

  const propertyOid = propertyId
    ? new mongoose.Types.ObjectId(propertyId)
    : null;

  const populate = (q: mongoose.Query<any, any>) =>
    q
      .populate("participants", "name photo role")
      .populate("property", "title images address.city")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name photo" },
      });

  // 1. Pehle dhundo
  let conversation = await populate(
    Conversation.findOne({
      participants: { $all: sorted, $size: 2 },
      property: propertyOid,
    }),
  ).lean<IConversation>();

  // 2. Na mile toh banao
  if (!conversation) {
    const created = await Conversation.create({
      participants: sorted,
      property: propertyOid,
      unreadCount: new Map(),
      lastMessageAt: new Date(),
    });

    conversation = (await populate(
      Conversation.findById(created._id),
    ).lean<IConversation>()) as IConversation;
  }

  if (!conversation) {
    throw new AppError("Failed to create conversation", 500);
  }

  return conversation;
};
// =============================================
// GET MY CONVERSATIONS — inbox list
// =============================================
export const getMyConversations = async (
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginationResult<IConversation>> => {
  const skip = (page - 1) * limit;

  const filter = { participants: new mongoose.Types.ObjectId(userId) };

  const [data, total] = await Promise.all([
    Conversation.find(filter)
      .populate("participants", "name photo role")
      .populate("property", "title images address.city")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name photo" },
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IConversation[]>(),
    Conversation.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// =============================================
// GET MESSAGES in a conversation — paginated
// Oldest first (for chat UI scroll)
// =============================================
export const getMessages = async (
  conversationId: string,
  userId: string,
  page = 1,
  limit = 50,
): Promise<PaginationResult<IMessage>> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }

  const conv =
    await Conversation.findById(conversationId).lean<IConversation>();
  if (!conv) throw new AppError("Conversation not found", 404);

  const isParticipant = conv.participants.some((p) => p.toString() === userId);
  if (!isParticipant)
    throw new AppError("Access denied to this conversation", 403);

  const skip = (page - 1) * limit;
  const filter = { conversation: new mongoose.Types.ObjectId(conversationId) };

  const [data, total] = await Promise.all([
    Message.find(filter)
      .populate("sender", "name photo role")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean<IMessage[]>(),
    Message.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// =============================================
// SEND MESSAGE — REST fallback
// Real-time path is via Socket.io
// =============================================
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string,
): Promise<IMessage> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }

  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new AppError("Conversation not found", 404);

  const isParticipant = conv.participants.some(
    (p) => p.toString() === senderId,
  );
  if (!isParticipant)
    throw new AppError("Access denied to this conversation", 403);

  // Save message
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    text: text.trim(),
  });

  // Update conversation meta — unread for the OTHER participant
  const otherId = conv.participants
    .find((p) => p.toString() !== senderId)
    ?.toString();

  const unreadUpdate: Record<string, number> = {};
  if (otherId) {
    unreadUpdate[`unreadCount.${otherId}`] =
      (conv.unreadCount.get(otherId) ?? 0) + 1;
  }

  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      ...unreadUpdate,
    },
  });

  const populated = await Message.findById(message._id)
    .populate("sender", "name photo role")
    .lean<IMessage>();

  return populated!;
};

// =============================================
// MARK MESSAGES AS READ
// =============================================
export const markAsRead = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }

  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new AppError("Conversation not found", 404);

  const isParticipant = conv.participants.some((p) => p.toString() === userId);
  if (!isParticipant) throw new AppError("Access denied", 403);

  const now = new Date();

  // Mark all unread messages from the OTHER person as read
  await Message.updateMany(
    {
      conversation: new mongoose.Types.ObjectId(conversationId),
      sender: { $ne: new mongoose.Types.ObjectId(userId) },
      isRead: false,
    },
    { $set: { isRead: true, readAt: now } },
  );

  // Reset this user's unread count to 0
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCount.${userId}`]: 0 },
  });
};
// =============================================
// EDIT MESSAGE — sender only
// =============================================
export const editMessage = async (
  messageId: string,
  userId: string,
  newText: string,
): Promise<IMessage> => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new AppError("Invalid message ID", 400);
  }

  if (!newText?.trim()) {
    throw new AppError("Message text cannot be empty", 400);
  }

  if (newText.trim().length > 2000) {
    throw new AppError("Message cannot exceed 2000 characters", 400);
  }

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  if (message.sender.toString() !== userId) {
    throw new AppError("You can only edit your own messages", 403);
  }

  // 1 hour window
  const oneHour = 60 * 60 * 1000;
  if (Date.now() - message.createdAt.getTime() > oneHour) {
    throw new AppError(
      "Messages can only be edited within 1 hour of sending",
      400,
    );
  }

  // Update
  message.text = newText.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  const populated = await Message.findById(message._id)
    .populate("sender", "name photo role")
    .lean<IMessage>();

  return populated!;
};

// =============================================
// DELETE MESSAGE — sender only, within 5 min
// =============================================
export const deleteMessage = async (
  messageId: string,
  userId: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new AppError("Invalid message ID", 400);
  }

  const message = await Message.findById(messageId);
  if (!message) throw new AppError("Message not found", 404);

  if (message.sender.toString() !== userId) {
    throw new AppError("You can only delete your own messages", 403);
  }

  const oneHour = 60 * 60 * 1000;
  if (Date.now() - message.createdAt.getTime() > oneHour) {
    throw new AppError(
      "Messages can only be deleted within 1 hour of sending",
      400,
    );
  }

  await message.deleteOne();
};

// =============================================
// TOTAL UNREAD COUNT — nav badge
// =============================================
export const getTotalUnread = async (userId: string): Promise<number> => {
  const convs = await Conversation.find({
    participants: new mongoose.Types.ObjectId(userId),
  }).select("unreadCount");

  let total = 0;
  for (const conv of convs) {
    total += conv.unreadCount.get(userId) ?? 0;
  }
  return total;
};
