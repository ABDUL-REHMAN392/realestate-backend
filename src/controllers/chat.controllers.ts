import mongoose from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import { Conversation, Message } from "../models/message.models";
import {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
  editMessage,
  deleteMessage,
  getTotalUnread,
} from "../services/chat.services";

// Express 5 — params are string | string[]
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
const toNum = (v: unknown, def: number): number => {
  const n = Number(v);
  return v !== undefined && v !== "" && !isNaN(n) ? n : def;
};

// =============================================
// POST /api/v1/chat/conversations
// =============================================
export const startConversationHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId, propertyId } = req.body as {
      userId: string;
      propertyId?: string;
    };

    const conversation = await getOrCreateConversation(
      req.user!._id.toString(),
      userId,
      propertyId,
    );

    sendSuccess(res, conversation, "Conversation ready");
  },
);

// =============================================
// GET /api/v1/chat/conversations
// =============================================
export const getConversationsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page  = toNum(req.query.page,  1);
    const limit = toNum(req.query.limit, 20);

    const result = await getMyConversations(
      req.user!._id.toString(),
      page,
      limit,
    );

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET /api/v1/chat/conversations/:id/messages
// =============================================
export const getMessagesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page  = toNum(req.query.page,  1);
    const limit = toNum(req.query.limit, 50);

    const result = await getMessages(
      p(req.params.id),
      req.user!._id.toString(),
      page,
      limit,
    );

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// POST /api/v1/chat/conversations/:id/messages
// REST fallback — primary path is Socket.io
// =============================================
export const sendMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { text } = req.body as { text: string };

    const message = await sendMessage(
      p(req.params.id),
      req.user!._id.toString(),
      text,
    );

    sendSuccess(res, message, "Message sent successfully", 201);
  },
);

// =============================================
// POST /api/v1/chat/conversations/:id/files
// Send file/image in chat — Cloudinary upload
// =============================================
export const sendFileMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const conversationId = p(req.params.id);
    const senderId       = req.user!._id.toString();

    const file = req.file as Express.Multer.File & {
      path:         string;
      filename:     string;
      mimetype:     string;
      originalname: string;
      size:         number;
    };

    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const isParticipant = conv.participants.some((p) => p.toString() === senderId);
    if (!isParticipant) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    const isImage  = file.mimetype.startsWith("image/");
    const fileType = isImage ? "image" : "document";
    const msgType  = isImage ? "image"  : "file";

    const captionText = (req.body.caption as string | undefined)?.trim() || undefined;

    const msg = await Message.create({
      conversation: conversationId,
      sender:       senderId,
      ...(captionText ? { text: captionText } : {}),
      messageType:  msgType as "text" | "image" | "file",
      file: {
        url:      file.path,
        publicId: file.filename,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType:  fileType as "image" | "document" | "other",
      },
    });

    // Cast to access _id reliably
    const savedMsg = msg as unknown as { _id: mongoose.Types.ObjectId };

    const populated = await Message.findById(savedMsg._id)
      .populate("sender", "name photo role")
      .lean();

    // Update conversation meta
    const otherId = conv.participants
      .find((pid) => pid.toString() !== senderId)
      ?.toString();

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        lastMessage:   savedMsg._id,
        lastMessageAt: new Date(),
        ...(otherId
          ? { [`unreadCount.${otherId}`]: (conv.unreadCount.get(otherId) ?? 0) + 1 }
          : {}),
      },
    });

    sendSuccess(res, { message: populated }, "File sent successfully", 201);
  },
);

// =============================================
// PATCH /api/v1/chat/conversations/:id/read
// =============================================
export const markReadHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await markAsRead(p(req.params.id), req.user!._id.toString());
    sendSuccess(res, null, "Messages marked as read");
  },
);

// =============================================
// PATCH /api/v1/chat/messages/:id
// =============================================
export const editMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { text } = req.body as { text: string };
    const message = await editMessage(
      p(req.params.id),
      req.user!._id.toString(),
      text,
    );
    sendSuccess(res, message, "Message edited successfully");
  },
);

// =============================================
// DELETE /api/v1/chat/messages/:id
// =============================================
export const deleteMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await deleteMessage(p(req.params.id), req.user!._id.toString());
    sendSuccess(res, null, "Message deleted successfully");
  },
);

// =============================================
// GET /api/v1/chat/unread
// =============================================
export const getUnreadCountHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const count = await getTotalUnread(req.user!._id.toString());
    sendSuccess(res, { unread: count }, "Unread count");
  },
);