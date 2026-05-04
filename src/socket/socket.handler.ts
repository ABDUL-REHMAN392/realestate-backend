import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import mongoose from "mongoose";
import { verifyAccessToken } from "../utils/jwtHelpers";
import User from "../models/user.models";
import { setNotificationEmitter } from "../services/notification.services";
import { Conversation, Message } from "../models/message.models";

interface AuthSocket extends Socket {
  userId: string;
  userName: string;
  userRole: string;
}

const onlineUsers = new Map<string, string>();

const authMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> => {
  try {
    const raw =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);
    if (!raw) return next(new Error("Auth token missing"));
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select(
      "_id name role isActive",
    );
    if (!user) return next(new Error("User not found"));
    if (!user.isActive) return next(new Error("Account suspended"));
    const s = socket as AuthSocket;
    s.userId = user._id.toString();
    s.userName = user.name;
    s.userRole = user.role;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
};

export const initSocket = (httpServer: HttpServer): SocketServer => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  io.use(authMiddleware);

  // ── Wire notification emitter → socket push ──
  setNotificationEmitter((userId: string, notif: unknown) => {
    const sid = onlineUsers.get(userId);
    if (sid) io.to(sid).emit("notification:new", notif);
  });

  io.on("connection", (raw: Socket) => {
    const socket = raw as AuthSocket;
    const { userId, userName } = socket;

    console.log(`✅ Socket connected: ${userName} [${userId}]`);
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit("user:online", { userId });

    socket.on("join:conversations", async () => {
      try {
        const convs = await Conversation.find({
          participants: new mongoose.Types.ObjectId(userId),
        })
          .select("_id")
          .lean();
        for (const c of convs) socket.join(`conv:${c._id.toString()}`);
        socket.emit("join:conversations:ok", { count: convs.length });
      } catch {
        socket.emit("error:chat", {
          message: "Failed to join conversation rooms",
        });
      }
    });

    socket.on("join:room", (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      socket.join(`conv:${data.conversationId}`);
    });

    socket.on("leave:room", (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      socket.leave(`conv:${data.conversationId}`);
    });

    socket.on(
      "message:send",
      async (data: {
        conversationId: string;
        text: string;
        replyTo?: string;
      }) => {
        try {
          const { conversationId, text, replyTo } = data ?? {};
          if (!conversationId || !text?.trim()) {
            socket.emit("error:chat", {
              message: "conversationId and text are required",
            });
            return;
          }
          if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            socket.emit("error:chat", { message: "Invalid conversationId" });
            return;
          }
          if (text.trim().length > 2000) {
            socket.emit("error:chat", {
              message: "Message cannot exceed 2000 characters",
            });
            return;
          }
          const conv = await Conversation.findById(conversationId);
          if (!conv) {
            socket.emit("error:chat", { message: "Conversation not found" });
            return;
          }
          const isParticipant = conv.participants.some(
            (p) => p.toString() === userId,
          );
          if (!isParticipant) {
            socket.emit("error:chat", { message: "Access denied" });
            return;
          }

          let replyToId: mongoose.Types.ObjectId | null = null;
          if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
            const parentMsg =
              await Message.findById(replyTo).select("_id conversation");
            if (
              parentMsg &&
              parentMsg.conversation.toString() === conversationId
            ) {
              replyToId = parentMsg._id as mongoose.Types.ObjectId;
            }
          }

          const msg = await Message.create({
            conversation: conversationId,
            sender: userId,
            text: text.trim(),
            replyTo: replyToId,
          });

          const populated = await Message.findById(msg._id)
            .populate("sender", "name photo role")
            .populate({
              path: "replyTo",
              select: "text file messageType sender isDeleted",
              populate: { path: "sender", select: "name" },
            })
            .lean();

          const otherId = conv.participants
            .find((p) => p.toString() !== userId)
            ?.toString();
          const unreadUpdate: Record<string, unknown> = {
            lastMessage: msg._id,
            lastMessageAt: new Date(),
          };
          if (otherId) {
            unreadUpdate[`unreadCount.${otherId}`] =
              (conv.unreadCount.get(otherId) ?? 0) + 1;
          }
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: unreadUpdate,
          });

          io.to(`conv:${conversationId}`).emit("message:new", populated);

          if (otherId) {
            const otherSid = onlineUsers.get(otherId);
            if (otherSid) {
              const otherSocket = io.sockets.sockets.get(otherSid);
              if (
                otherSocket &&
                !otherSocket.rooms.has(`conv:${conversationId}`)
              ) {
                io.to(otherSid).emit("conversation:new_message", {
                  conversationId,
                  message: populated,
                });
              }
            }
          }
        } catch (err) {
          console.error("message:send error:", err);
          socket.emit("error:chat", { message: "Failed to send message" });
        }
      },
    );

    socket.on("typing:start", (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      socket
        .to(`conv:${data.conversationId}`)
        .emit("typing:start", { userId, conversationId: data.conversationId });
    });

    socket.on("typing:stop", (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      socket
        .to(`conv:${data.conversationId}`)
        .emit("typing:stop", { userId, conversationId: data.conversationId });
    });

    socket.on(
      "message:edit",
      async (data: { messageId: string; text: string }) => {
        try {
          const { messageId, text } = data ?? {};
          if (!messageId || !text?.trim()) {
            socket.emit("error:chat", {
              message: "messageId and text required",
            });
            return;
          }
          if (!mongoose.Types.ObjectId.isValid(messageId)) {
            socket.emit("error:chat", { message: "Invalid messageId" });
            return;
          }
          const message = await Message.findById(messageId);
          if (!message) {
            socket.emit("error:chat", { message: "Message not found" });
            return;
          }
          if (message.sender.toString() !== userId) {
            socket.emit("error:chat", {
              message: "You can only edit your own messages",
            });
            return;
          }
          if (Date.now() - message.createdAt.getTime() > 3600000) {
            socket.emit("error:chat", {
              message: "Edit window expired (1 hour)",
            });
            return;
          }
          message.text = text.trim();
          message.isEdited = true;
          message.editedAt = new Date();
          await message.save();
          const populated = await Message.findById(message._id)
            .populate("sender", "name photo role")
            .lean();
          io.to(`conv:${message.conversation.toString()}`).emit(
            "message:edited",
            populated,
          );
        } catch (err) {
          console.error("message:edit error:", err);
          socket.emit("error:chat", { message: "Failed to edit message" });
        }
      },
    );

    // =============================================
    // ✅ DELETE MESSAGE
    // Message DB se delete nahi hota, sirf mark hota hai
    // Poore room ko updated message milta hai
    // =============================================
    socket.on(
      "message:delete",
      async (data: { messageId: string; conversationId: string }) => {
        try {
          const { messageId, conversationId } = data ?? {};
          if (!messageId || !conversationId) {
            socket.emit("error:chat", {
              message: "messageId and conversationId required",
            });
            return;
          }
          if (!mongoose.Types.ObjectId.isValid(messageId)) {
            socket.emit("error:chat", { message: "Invalid messageId" });
            return;
          }

          const message = await Message.findById(messageId);
          if (!message) {
            socket.emit("error:chat", { message: "Message not found" });
            return;
          }
          if (message.sender.toString() !== userId) {
            socket.emit("error:chat", {
              message: "You can only delete your own messages",
            });
            return;
          }
          if (Date.now() - message.createdAt.getTime() > 3600000) {
            socket.emit("error:chat", {
              message: "Delete window expired (1 hour)",
            });
            return;
          }

          // ✅ DB mein sirf isDeleted = true karo, text clear karo
          message.isDeleted = true;
          message.text = undefined;
          message.file = undefined;
          message.messageType = "text";
          await message.save();

          // ✅ Poore room ko updated message object bhejo
          // Frontend is object ko receive karke bubble update karega
          const updatedMsg = {
            _id: messageId,
            conversation: conversationId,
            isDeleted: true,
            text: undefined,
            file: undefined,
            messageType: "text",
          };

          io.to(`conv:${conversationId}`).emit("message:deleted", updatedMsg);
        } catch (err) {
          console.error("message:delete error:", err);
          socket.emit("error:chat", { message: "Failed to delete message" });
        }
      },
    );

    socket.on(
      "file:broadcast",
      async (data: { conversationId: string; message: unknown }) => {
        try {
          const { conversationId, message } = data ?? {};
          if (!conversationId || !message) return;
          if (!mongoose.Types.ObjectId.isValid(conversationId)) return;
          const conv = await Conversation.findById(conversationId);
          if (!conv) return;
          const isParticipant = conv.participants.some(
            (p) => p.toString() === userId,
          );
          if (!isParticipant) return;
          socket.to(`conv:${conversationId}`).emit("message:new", message);
          const otherId = conv.participants
            .find((p) => p.toString() !== userId)
            ?.toString();
          if (otherId) {
            const otherSid = onlineUsers.get(otherId);
            if (otherSid) {
              const otherSocket = io.sockets.sockets.get(otherSid);
              if (
                otherSocket &&
                !otherSocket.rooms.has(`conv:${conversationId}`)
              ) {
                io.to(otherSid).emit("conversation:new_message", {
                  conversationId,
                  message,
                });
              }
            }
          }
        } catch (err) {
          console.error("file:broadcast error:", err);
        }
      },
    );

    socket.on("messages:read", async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data ?? {};
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId))
          return;
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;
        const isParticipant = conv.participants.some(
          (p) => p.toString() === userId,
        );
        if (!isParticipant) return;
        const now = new Date();
        await Message.updateMany(
          {
            conversation: new mongoose.Types.ObjectId(conversationId),
            sender: { $ne: new mongoose.Types.ObjectId(userId) },
            isRead: false,
          },
          { $set: { isRead: true, readAt: now } },
        );
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCount.${userId}`]: 0 },
        });
        socket
          .to(`conv:${conversationId}`)
          .emit("messages:seen", {
            conversationId,
            seenBy: userId,
            seenAt: now,
          });
      } catch (err) {
        console.error("messages:read error:", err);
      }
    });

    socket.on("users:online_status", (data: { userIds: string[] }) => {
      if (!Array.isArray(data?.userIds)) return;
      const result: Record<string, boolean> = {};
      for (const id of data.userIds) result[id] = onlineUsers.has(id);
      socket.emit("users:online_status", result);
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`❌ Socket disconnected: ${userName} — ${reason}`);
      onlineUsers.delete(userId);
      socket.broadcast.emit("user:offline", { userId });
    });
  });

  return io;
};

export const getOnlineUsers = (): ReadonlyMap<string, string> => onlineUsers;