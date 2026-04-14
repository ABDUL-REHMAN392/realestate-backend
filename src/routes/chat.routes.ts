import { Router } from "express";
import {
  startConversationHandler,
  getConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
  editMessageHandler,
  deleteMessageHandler,
  getUnreadCountHandler,
} from "../controllers/chat.controllers";
import { protect } from "../middlewares/auth.middlewares";
import {
  validate,
  startConversationSchema,
  sendMessageSchema,
  editMessageSchema,
} from "../middlewares/validator.middlewares";

const router = Router();

// All chat routes require authentication
router.use(protect);

// =============================================
// CONVERSATION ROUTES
// =============================================

// POST   /api/v1/chat/conversations     — start / get conversation
router.post(
  "/conversations",
  validate(startConversationSchema),
  startConversationHandler,
);

// GET    /api/v1/chat/conversations     — mera inbox
router.get("/conversations", getConversationsHandler);

// GET    /api/v1/chat/conversations/:id/messages  — messages load
router.get("/conversations/:id/messages", getMessagesHandler);

// POST   /api/v1/chat/conversations/:id/messages  — message send (REST)
router.post(
  "/conversations/:id/messages",
  validate(sendMessageSchema),
  sendMessageHandler,
);

// PATCH  /api/v1/chat/conversations/:id/read  — mark messages as read
router.patch("/conversations/:id/read", markReadHandler);

// =============================================
// MESSAGE ROUTES
// =============================================
// PATCH /api/v1/chat/messages/:id  — edit message (1 hour)
router.patch("/messages/:id", validate(editMessageSchema), editMessageHandler);

// DELETE /api/v1/chat/messages/:id  — apna message delete (1 hour)
router.delete("/messages/:id", deleteMessageHandler);

// =============================================
// UTILITY
// =============================================

// GET    /api/v1/chat/unread  — total unread badge count
router.get("/unread", getUnreadCountHandler);

export default router;
