import User, { IUser } from "../models/user.models";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtHelpers";
import { AppError } from "../utils/errorHandler";
import { AuthResult, TokenPair } from "../types";

// =============================================
// Format user for response — strip sensitive fields
// =============================================
const formatUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  photo: user.photo || null,
});

// =============================================
// Generate both tokens + save refresh in DB
// =============================================
const generateAndSaveTokens = async (user: IUser): Promise<TokenPair> => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// =============================================
// REGISTER
// =============================================
export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "buyer" | "agent";
}): Promise<AuthResult> => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw new AppError("This email is already registered", 409);
  }

  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: data.password, // pre-save hook will hash it
    phone: data.phone,
    role: data.role || "buyer",
  });

  const tokens = await generateAndSaveTokens(user);

  return { user: formatUser(user), ...tokens };
};

// =============================================
// LOGIN
// =============================================
export const loginUser = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  const user = await User.findOne({ email }).select(
    "+passwordHash +refreshToken",
  );

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError(
      "Your account has been suspended. Please contact support",
      403,
    );
  }

  const tokens = await generateAndSaveTokens(user);

  return { user: formatUser(user), ...tokens };
};

// =============================================
// REFRESH TOKEN
// =============================================
export const refreshTokens = async (
  oldRefreshToken: string,
): Promise<TokenPair> => {
  if (!oldRefreshToken) {
    throw new AppError("Refresh token is required. Please log in again", 401);
  }

  const decoded = verifyRefreshToken(oldRefreshToken);

  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== oldRefreshToken) {
    throw new AppError("Invalid session. Please log in again", 401);
  }

  // Token rotation — issue new pair
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// =============================================
// LOGOUT
// =============================================
export const logoutUser = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

// =============================================
// CHANGE PASSWORD
// =============================================
export const changeUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new AppError("User not found", 404);

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError("Current password is incorrect", 401);

  // Update password + invalidate all sessions
  user.passwordHash = newPassword; // pre-save hook will hash it
  user.refreshToken = undefined;
  await user.save();
};
