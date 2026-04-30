import { Notification, NotificationType } from "../models/notification.models";
import mongoose from "mongoose";

// ── Create & emit via socket ───────────────────
let _ioEmitter: ((userId: string, notification: unknown) => void) | null = null;

export function setNotificationEmitter(fn: (userId: string, notif: unknown) => void) {
  _ioEmitter = fn;
}

export async function createNotification({
  recipientId,
  type,
  title,
  body,
  link,
}: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  const notif = await Notification.create({
    recipient: new mongoose.Types.ObjectId(recipientId),
    type,
    title,
    body,
    link,
  });

  // Real-time push if user is online
  if (_ioEmitter) _ioEmitter(recipientId, notif);

  return notif;
}

// ── Get user's notifications ───────────────────
export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [data, total, unread] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);
  return { data, total, unread, page, limit };
}

// ── Mark one as read ───────────────────────────
export async function markOneRead(notifId: string, userId: string) {
  return Notification.findOneAndUpdate(
    { _id: notifId, recipient: userId },
    { isRead: true },
    { new: true }
  );
}

// ── Mark all as read ───────────────────────────
export async function markAllRead(userId: string) {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
}

// ── Delete one ─────────────────────────────────
export async function deleteOne(notifId: string, userId: string) {
  await Notification.findOneAndDelete({ _id: notifId, recipient: userId });
}

// ── Unread count ───────────────────────────────
export async function getUnreadCount(userId: string) {
  return Notification.countDocuments({ recipient: userId, isRead: false });
}