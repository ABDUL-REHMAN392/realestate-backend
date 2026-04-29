import User, { IUser } from '../models/user.models';
import { AppError } from '../utils/errorHandler';
import { deleteFromCloudinary } from '../utils/cloudinary';
import { PaginationResult, UserFilters, SafeUser } from '../types';

// =============================================
// Format user safely — strip all sensitive fields
// =============================================
const formatUser = (user: IUser): SafeUser => ({
  id:    user._id,
  name:  user.name,
  email: user.email,
  role:  user.role,
  photo: user.photo || null,
});

// =============================================
// GET PROFILE
// =============================================
export const getProfile = (user: IUser): SafeUser => formatUser(user);

// =============================================
// UPDATE PROFILE
// =============================================
export const updateProfile = async (
  userId:  string,
  updates: { name?: string; phone?: string },
): Promise<SafeUser> => {
  const allowedUpdates: Record<string, unknown> = {};

  if (updates.name  !== undefined && updates.name.trim()  !== '') {
    allowedUpdates.name = updates.name.trim();
  }
  if (updates.phone !== undefined && updates.phone.trim() !== '') {
    allowedUpdates.phone = updates.phone.trim();
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw new AppError('Please provide at least one field to update (name or phone)', 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    allowedUpdates,
    { returnDocument: 'after', runValidators: true },
  );

  if (!user) throw new AppError('User not found', 404);
  return formatUser(user);
};

// =============================================
// UPDATE AVATAR
// =============================================
export const updateAvatar = async (
  userId:       string,
  filePath:     string,
  filePublicId: string,
): Promise<string> => {
  const currentUser = await User.findById(userId).select('+photoPublicId');
  if (currentUser?.photoPublicId) {
    await deleteFromCloudinary(currentUser.photoPublicId);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { photo: filePath, photoPublicId: filePublicId },
    { returnDocument: 'after' },
  );

  if (!user) throw new AppError('User not found', 404);
  return user.photo || '';
};

// =============================================
// REMOVE AVATAR
// =============================================
export const removeAvatar = async (userId: string): Promise<void> => {
  const user = await User.findById(userId).select('+photoPublicId');
  if (!user) throw new AppError('User not found', 404);

  if (user.photoPublicId) {
    await deleteFromCloudinary(user.photoPublicId);
  }

  await User.findByIdAndUpdate(userId, { photo: null, photoPublicId: null });
};

// =============================================
// DELETE ACCOUNT
//
// Do cases:
//   1. Normal user  → password confirm zaroori hai
//   2. OAuth user   → password nahi hota, seedha delete
// =============================================
export const deleteAccount = async (
  userId:    string,
  password?: string,   // ← optional — OAuth ke liye nahi chahiye
): Promise<void> => {
  const user = await User
    .findById(userId)
    .select('+passwordHash +photoPublicId +isOAuthUser');

  if (!user) throw new AppError('User not found', 404);

  // ─── OAuth user ────────────────────────────────────────
  // Google/Facebook se aaye hain — password check skip
  if (user.isOAuthUser) {
    if (user.photoPublicId) {
      await deleteFromCloudinary(user.photoPublicId);
    }
    await User.findByIdAndDelete(userId);
    return;
  }

  // ─── Normal (credentials) user ─────────────────────────
  // Password confirm karna zaroori hai
  if (!password) {
    throw new AppError('Please provide your password to confirm account deletion', 400);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Incorrect password. Account deletion cancelled', 401);
  }

  if (user.photoPublicId) {
    await deleteFromCloudinary(user.photoPublicId);
  }

  await User.findByIdAndDelete(userId);
};

// =============================================
// GET ALL USERS (Admin)
// =============================================
export const getAllUsers = async (
  filters: UserFilters,
): Promise<PaginationResult<IUser>> => {
  const page  = filters.page  || 1;
  const limit = filters.limit || 20;
  const skip  = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (filters.role)                   query.role     = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;

  const [data, total] = await Promise.all([
    User.find(query).sort('-createdAt').skip(skip).limit(limit).select('-__v'),
    User.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// =============================================
// GET USER BY ID (Admin)
// =============================================
export const getUserById = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId).select('-__v');
  if (!user) throw new AppError('User not found', 404);
  return user;
};

// =============================================
// TOGGLE USER STATUS (Admin)
// =============================================
export const toggleUserStatus = async (
  targetUserId: string,
  adminUserId:  string,
  isActive:     boolean,
): Promise<IUser> => {
  if (targetUserId === adminUserId) {
    throw new AppError('You cannot suspend your own account', 400);
  }

  const user = await User.findByIdAndUpdate(
    targetUserId,
    { isActive },
    { returnDocument: 'after' },
  );

  if (!user) throw new AppError('User not found', 404);
  return user;
};
