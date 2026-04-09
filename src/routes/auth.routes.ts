import { Router } from "express";

import {
  register,
  login,
  refreshAccessToken,
  logout,
  changePassword,
} from "../controllers/auth.controllers";

import { protect } from "../middlewares/auth.middlewares";
import {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../middlewares/validator.middlewares";
const router = Router();

// =============================================
// PUBLIC Routes
// =============================================
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refreshAccessToken);

// =============================================
// PROTECTED Routes
// =============================================
router.use(protect);

router.post("/logout", logout);
router.patch(
  "/change-password",
  validate(changePasswordSchema),
  changePassword,
);

export default router;
