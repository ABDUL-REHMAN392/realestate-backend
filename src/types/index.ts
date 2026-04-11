import { Request } from "express";
import { IUser } from "../models/user.models";
import mongoose from "mongoose";

// =============================================
// Auth Request — protect middleware
// =============================================
export interface AuthRequest extends Request {
  user?: IUser;
}

// =============================================
// Token Payloads
// =============================================
export interface AccessTokenPayload {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  iat?: number;
  exp?: number;
}

// =============================================
// Service Return Types
// =============================================
export interface AuthResult {
  user: {
    id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    role: string;
    photo: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: string;
  photo: string | null;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
// =============================================
// Property Types
// =============================================
export interface PropertyImagePayload {
  url: string;
  publicId: string;
  isPrimary: boolean;
}
