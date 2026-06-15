import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string | null;
  googleId: string | null;
  fullName: string | null;
  biography: string;
  avatarUrl: string | null;
  role: "super_admin" | "admin" | "user";
  signupMethod: "direct" | "google";
  isActive: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  refreshToken: string | null;
  // FIX: Forgot password fields
  passwordResetToken: string | undefined;
  passwordResetExpires: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },
    googleId: { type: String, default: null, sparse: true },
    fullName: { type: String, trim: true, default: null },
    biography: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: ["super_admin", "admin", "user"], default: "user" },
    signupMethod: { type: String, enum: ["direct", "google"], required: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String, default: null },
    isBlocked: { type: Boolean, default: false },
    // FIX: password reset fields
    passwordResetToken: { type: String, default: undefined, select: false },
    passwordResetExpires: { type: Date, default: undefined, select: false },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
