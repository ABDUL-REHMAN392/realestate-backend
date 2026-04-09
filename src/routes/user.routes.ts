import { Router } from "express";

import {
  getMe,
  updateMe,
  deleteMe,
  uploadAvatar,
  deleteAvatar,
  getAllUsers,
  getUserById,
  toggleUserStatus,
} from "../controllers/user.controllers";

import { protect, allowOnly } from "../middlewares/auth.middlewares";
import { validate, updateMeSchema } from "../middlewares/validator.middlewares";
import { avatarUploadMiddleware } from "../middlewares/upload.middlewares";
const router = Router();

// All routes require login
router.use(protect);

// =============================================
// MY PROFILE — buyer / agent / admin
// =============================================
router.get("/me", getMe);
router.patch("/me", validate(updateMeSchema), updateMe);
router.delete("/me", deleteMe);

// =============================================
// AVATAR — buyer / agent / admin
// =============================================
router.post("/me/avatar", avatarUploadMiddleware, uploadAvatar);
router.delete("/me/avatar", deleteAvatar);

// =============================================
// ADMIN ONLY ROUTES
// =============================================
router.use(allowOnly("admin"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.patch("/:id/status", toggleUserStatus);

export default router;
