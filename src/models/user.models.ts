import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: "buyer" | "agent" | "admin";
  photo?: string;
  photoPublicId?: string;
  isActive: boolean;
  refreshToken?: string;
  passwordChangedAt?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  changedPasswordAfter(jwtTimestamp: number): boolean;
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ["buyer", "agent", "admin"], default: "buyer" },
    photo: { type: String, default: null },
    photoPublicId: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, select: false },
    passwordChangedAt: Date,
    lastLogin: Date,
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre("save", async function () {
  const doc = this as unknown as IUser;

  if (!doc.isModified("passwordHash")) return;

  doc.passwordHash = await bcrypt.hash(doc.passwordHash, 12);
  doc.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.changedPasswordAfter = function (
  jwtTimestamp: number,
): boolean {
  if (this.passwordChangedAt) {
    const changedAt = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtTimestamp < changedAt;
  }
  return false;
};

const User = mongoose.model<IUser>("User", userSchema);
export default User;
