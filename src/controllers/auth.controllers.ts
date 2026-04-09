import { Response, NextFunction, Request } from "express";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess } from "../utils/apiResponse";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/jwtHelpers";
import { AuthRequest } from "../types";
import * as authService from "../services/auth.services";
import { Response as ExpressResponse } from "express";

// =============================================
// Helper — set both tokens
// accessToken  → httpOnly cookie  (web)
//             → also in response body (mobile/app)
// refreshToken → httpOnly cookie  (web)
//             → also in response body (mobile/app)
// =============================================
const setAuthCookies = (
  res: ExpressResponse,
  accessToken: string,
  refreshToken: string,
): void => {
  // Access token cookie — 15 min
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token cookie — 7 days
  setRefreshTokenCookie(res, refreshToken);
};

// =============================================
// REGISTER
// POST /api/v1/auth/register
// =============================================
export const register = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { name, email, password, phone, role } = req.body;

    const result = await authService.registerUser({
      name,
      email,
      password,
      phone,
      role,
    });

    // Set both cookies (for web)
    setAuthCookies(res, result.accessToken, result.refreshToken);

    // Also send tokens in body (for mobile/app)
    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
      "Account created successfully! Welcome!",
      201,
    );
  },
);

// =============================================
// LOGIN
// POST /api/v1/auth/login
// =============================================
export const login = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    const result = await authService.loginUser(email, password);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
      "Logged in successfully!",
    );
  },
);

// =============================================
// REFRESH TOKEN
// POST /api/v1/auth/refresh
// Web  → reads refreshToken from cookie
// App  → reads refreshToken from body { refreshToken }
// =============================================
export const refreshAccessToken = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Cookie (web) or body (mobile app)
    const token =
      (req.cookies?.refreshToken as string | undefined) ||
      (req.body?.refreshToken as string | undefined);

    const tokens = await authService.refreshTokens(token!);

    // Update both cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    sendSuccess(
      res,
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      "Token refreshed successfully",
    );
  },
);

// =============================================
// LOGOUT
// POST /api/v1/auth/logout
// =============================================
export const logout = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    await authService.logoutUser(String(req.user!._id));

    // Clear both cookies
    clearRefreshTokenCookie(res);
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    sendSuccess(res, null, "Logged out successfully. Goodbye!");
  },
);

// =============================================
// CHANGE PASSWORD
// PATCH /api/v1/auth/change-password
// =============================================
export const changePassword = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const { currentPassword, newPassword } = req.body;

    await authService.changeUserPassword(
      String(req.user!._id),
      currentPassword,
      newPassword,
    );

    // Clear cookies — force re-login on all clients
    clearRefreshTokenCookie(res);
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    sendSuccess(
      res,
      null,
      "Password changed successfully. Please log in again.",
    );
  },
);
