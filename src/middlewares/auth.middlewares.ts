import { Response, NextFunction } from "express";
import { AppError, catchAsync } from "../utils/errorHandler";
import { verifyAccessToken } from "../utils/jwtHelpers";
import { AuthRequest } from "../types";
import User from "../models/user.models";

// =============================================
// Token Extractor Helper
// Priority: Authorization header (Bearer) → Cookie
// Web  clients → cookie (httpOnly, set by server)
// Mobile/app  → Bearer token in header
// =============================================
const extractToken = (req: AuthRequest): string | null => {
  // 1. Bearer token — mobile apps / Postman / external clients
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.split(" ")[1];
  }

  // 2. HttpOnly cookie — web browsers
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken as string;
  }

  return null;
};

// =============================================
// PROTECT
// Requires valid access token (cookie or Bearer)
// =============================================
export const protect = catchAsync(
  async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const token = extractToken(req);
    if (!token) throw new AppError("Please log in to continue", 401);

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select("-__v");
    if (!user) throw new AppError("This account no longer exists", 401);
    if (!user.isActive)
      throw new AppError(
        "Your account has been suspended. Please contact support",
        403,
      );

    if (decoded.iat && user.changedPasswordAfter(decoded.iat)) {
      throw new AppError(
        "Password was recently changed. Please log in again",
        401,
      );
    }

    req.user = user;
    next();
  },
);

// =============================================
// ALLOW ONLY
// Role-based access control
// =============================================
export const allowOnly =
  (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Only ${roles.join(" or ")} can perform this action`,
          403,
        ),
      );
    }
    next();
  };

// =============================================
// OPTIONAL AUTH
// Token optional — public pages that show
// extra content when logged in
// =============================================
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select("-__v");
      if (user?.isActive) req.user = user;
    }
  } catch {
    /* ignore — optional auth, no error needed */
  }
  next();
};
