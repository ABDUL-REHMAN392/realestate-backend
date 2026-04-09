import jwt, { SignOptions } from "jsonwebtoken";
import { Response } from "express";
import { Types } from "mongoose";

export interface AccessPayload {
  id: Types.ObjectId | string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  id: Types.ObjectId | string;
  iat?: number;
  exp?: number;
}

const signToken = (
  payload: object,
  secret: string,
  expiresIn: string,
): string => {
  const opts = { expiresIn } as SignOptions;
  return jwt.sign(payload, secret, opts);
};

export const generateAccessToken = (
  userId: Types.ObjectId | string,
  role: string,
): string =>
  signToken(
    { id: String(userId), role },
    process.env.JWT_ACCESS_SECRET as string,
    (process.env.JWT_ACCESS_EXPIRES as string) || "15m", // ✅ matches .env
  );

export const generateRefreshToken = (userId: Types.ObjectId | string): string =>
  signToken(
    { id: String(userId) },
    process.env.JWT_REFRESH_SECRET as string,
    (process.env.JWT_REFRESH_EXPIRES as string) || "7d", // ✅ matches .env
  );

// =============================================
// Cookie Helpers
// Web  → reads from httpOnly cookie (secure)
// App  → reads from Authorization header (Bearer)
// =============================================
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
  });
};

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as AccessPayload;

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as RefreshPayload;
