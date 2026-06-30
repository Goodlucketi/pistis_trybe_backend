import { Schema, model, Document, Types } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  imageUrl: string | null;
  publishedBy: Types.ObjectId;
  targetRole: "all" | "user" | "admin";
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetRole: { type: String, enum: ["all", "user", "admin"], default: "all" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ isPublished: 1, createdAt: -1 });

export const Announcement = model<IAnnouncement>("Announcement", AnnouncementSchema);
