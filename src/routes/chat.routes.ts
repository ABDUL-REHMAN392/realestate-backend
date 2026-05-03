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
  sendFileMessageHandler,
} from "../controllers/chat.controllers";
import { protect } from "../middlewares/auth.middlewares";
import {
  validate,
  startConversationSchema,
  sendMessageSchema,
  editMessageSchema,
} from "../middlewares/validator.middlewares";
import { chatFileUploadMiddleware } from "../middlewares/upload.middlewares";

const router = Router();

router.use(protect);

// =============================================
// CONVERSATION ROUTES
// =============================================
router.post("/conversations",              validate(startConversationSchema), startConversationHandler);
router.get("/conversations",               getConversationsHandler);
router.get("/conversations/:id/messages",  getMessagesHandler);
router.post("/conversations/:id/messages", validate(sendMessageSchema), sendMessageHandler);
router.patch("/conversations/:id/read",    markReadHandler);

// File upload in chat — images + PDF + Word
router.post("/conversations/:id/files", chatFileUploadMiddleware, sendFileMessageHandler);

// =============================================
// MESSAGE ROUTES
// =============================================
router.patch("/messages/:id",  validate(editMessageSchema), editMessageHandler);
router.delete("/messages/:id", deleteMessageHandler);

// =============================================
// UTILITY
// =============================================
router.get("/unread", getUnreadCountHandler);

export default router;