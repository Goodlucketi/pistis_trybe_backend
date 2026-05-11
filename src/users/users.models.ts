import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string | null;
  googleId: string | null;
  fullName: string | null;
  biography: string;
  avatarUrl: string | null;
  role: "super_admin" | "admin" | "user";
  singupMethod: "direct" | "google";
  isActive: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, default: null },
    googleId: { type: String, default: null, sparse: true },
    fullName: { type: String, trim: true, default: null },
    biography: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    singupMethod: {
      type: String,
      enum: ["direct", "google"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String, default: null },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);