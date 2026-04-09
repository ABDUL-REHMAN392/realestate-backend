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
// Only updates fields that are present AND non-empty
// Empty string "" is treated as "not provided"
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
  return formatUser(user);   // ✅ clean response — no __v, passwordChangedAt etc
};

// =============================================
// UPDATE AVATAR
// Deletes old Cloudinary image before saving new
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
// Steps:
//   1. Verify password (safety check)
//   2. Delete avatar from Cloudinary (if any)
//   3. Hard delete user from DB
// =============================================
export const deleteAccount = async (
  userId:   string,
  password: string,
): Promise<void> => {
  const user = await User
    .findById(userId)
    .select('+passwordHash +photoPublicId');

  if (!user) throw new AppError('User not found', 404);

  // Must confirm with password before deletion
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError('Incorrect password. Account deletion cancelled', 401);

  // Cleanup Cloudinary avatar
  if (user.photoPublicId) {
    await deleteFromCloudinary(user.photoPublicId);
  }

  // Hard delete from DB
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