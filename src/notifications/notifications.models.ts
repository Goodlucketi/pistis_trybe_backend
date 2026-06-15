import { Schema, model, Document, Types } from "mongoose";

export type NotificationType =
  | "new_message"
  | "group_invite"
  | "post_like"
  | "post_comment"
  | "group_role_change"
  | "announcement"
  | "follow";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: Types.ObjectId | null;
  referenceModel: string | null;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "new_message",
        "group_invite",
        "post_like",
        "post_comment",
        "group_role_change",
        "announcement",
        "follow",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    referenceModel: { type: String, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification>("Notification", NotificationSchema);
