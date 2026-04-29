import { Response, NextFunction } from "express";
import { AppError, catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import { clearRefreshTokenCookie } from "../utils/jwtHelpers";
import { AuthRequest } from "../types";
import * as userService from "../services/user.services";

// =============================================
// GET MY PROFILE
// GET /api/v1/users/me
// =============================================
export const getMe = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const user = userService.getProfile(req.user!);
    sendSuccess(res, { user }, "Profile retrieved successfully");
  },
);

// =============================================
// UPDATE MY PROFILE
// PATCH /api/v1/users/me
// =============================================
export const updateMe = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (req.body.password || req.body.passwordHash) {
      throw new AppError(
        "To change your password use /api/v1/auth/change-password",
        400,
      );
    }

    const user = await userService.updateProfile(String(req.user!._id), {
      name:  req.body.name,
      phone: req.body.phone,
    });

    sendSuccess(res, { user }, "Profile updated successfully");
  },
);

// =============================================
// DELETE MY ACCOUNT
// DELETE /api/v1/users/me
// Normal user → Body: { "password": "yourPassword" }
// OAuth user  → Body: {} (password nahi chahiye)
// =============================================
export const deleteMe = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    // password optional hai — service mein handle hoga
    const { password } = req.body;

    await userService.deleteAccount(String(req.user!._id), password);

    // Clear auth cookies
    clearRefreshTokenCookie(res);
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    sendSuccess(res, null, "Account deleted successfully");
  },
);

// =============================================
// UPLOAD AVATAR
// POST /api/v1/users/me/avatar
// =============================================
export const uploadAvatar = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    if (!req.file) throw new AppError("No image was uploaded", 400);

    const file = req.file as Express.Multer.File & {
      path:     string;
      filename: string;
    };

    const photo = await userService.updateAvatar(
      String(req.user!._id),
      file.path,
      file.filename,
    );

    sendSuccess(res, { photo }, "Avatar uploaded successfully");
  },
);

// =============================================
// DELETE AVATAR
// DELETE /api/v1/users/me/avatar
// =============================================
export const deleteAvatar = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    await userService.removeAvatar(String(req.user!._id));
    sendSuccess(res, null, "Avatar removed successfully");
  },
);

// =============================================
// GET ALL USERS (Admin)
// GET /api/v1/users?page=1&limit=20&role=buyer&isActive=true
// =============================================
export const getAllUsers = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const result = await userService.getAllUsers({
      page:     Number(req.query.page)  || 1,
      limit:    Number(req.query.limit) || 20,
      role:     req.query.role as string,
      isActive: req.query.isActive !== undefined
        ? req.query.isActive === "true"
        : undefined,
    });

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET USER BY ID (Admin)
// GET /api/v1/users/:id
// =============================================
export const getUserById = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const user = await userService.getUserById(String(req.params.id));
    sendSuccess(res, { user }, "User retrieved successfully");
  },
);

// =============================================
// TOGGLE USER STATUS (Admin)
// PATCH /api/v1/users/:id/status
// =============================================
export const toggleUserStatus = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { isActive } = req.body;

    const user = await userService.toggleUserStatus(
      String(req.params.id),
      String(req.user!._id),
      isActive,
    );

    sendSuccess(
      res,
      { user },
      isActive ? "Account activated successfully" : "Account suspended successfully",
    );
  },
);
