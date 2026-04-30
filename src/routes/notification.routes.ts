import { Router } from "express";
import { protect } from "../middlewares/auth.middlewares";
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  deleteNotificationHandler,
} from "../controllers/notification.controllers";

const router = Router();

router.use(protect);

router.get("/",                       getNotificationsHandler);
router.get("/unread-count",           getUnreadCountHandler);
router.patch("/read-all",             markAllReadHandler);
router.patch("/:id/read",             markReadHandler);
router.delete("/:id",                 deleteNotificationHandler);

export default router;