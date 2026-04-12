import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markAsRead,
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
    const page = toNum(req.query.page, 1);
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
// Load messages in a conversation
// =============================================
export const getMessagesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = toNum(req.query.page, 1);
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
// Send a message — REST fallback
// (Primary real-time path: Socket.io message:send)
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
// PATCH /api/v1/chat/conversations/:id/read
// Mark all messages as read
// =============================================
export const markReadHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await markAsRead(p(req.params.id), req.user!._id.toString());
    sendSuccess(res, null, "Messages read mark ho gaye");
  },
);

// =============================================
// DELETE /api/v1/chat/messages/:id
// Delete own message (5 min window)
// =============================================
export const deleteMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await deleteMessage(p(req.params.id), req.user!._id.toString());
    sendSuccess(res, null, "Message deleted successfully");
  },
);

// =============================================
// GET /api/v1/chat/unread
// Nav badge ke liye total unread count
// =============================================
export const getUnreadCountHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const count = await getTotalUnread(req.user!._id.toString());
    sendSuccess(res, { unread: count }, "Unread count");
  },
);
