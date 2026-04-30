import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess } from "../utils/apiResponse";
import * as notifService from "../services/notification.services";

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
const toNum = (v: unknown, def: number): number => {
  const n = Number(v);
  return v !== undefined && v !== "" && !isNaN(n) ? n : def;
};

// GET /api/v1/notifications
export const getNotificationsHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await notifService.getUserNotifications(
    req.user!._id.toString(),
    toNum(req.query.page, 1),
    toNum(req.query.limit, 20)
  );
  sendSuccess(res, result);
});

// GET /api/v1/notifications/unread-count
export const getUnreadCountHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const count = await notifService.getUnreadCount(req.user!._id.toString());
  sendSuccess(res, { count });
});

// PATCH /api/v1/notifications/:id/read
export const markReadHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const notif = await notifService.markOneRead(p(req.params.id), req.user!._id.toString());
  sendSuccess(res, { notification: notif }, "Marked as read");
});

// PATCH /api/v1/notifications/read-all
export const markAllReadHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  await notifService.markAllRead(req.user!._id.toString());
  sendSuccess(res, null, "All marked as read");
});

// DELETE /api/v1/notifications/:id
export const deleteNotificationHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  await notifService.deleteOne(p(req.params.id), req.user!._id.toString());
  sendSuccess(res, null, "Notification deleted");
});