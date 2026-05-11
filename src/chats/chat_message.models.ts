import { Schema, model, Document, Types } from "mongoose";

export interface IChatMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
  mediaUrl: string | null;
  replyTo: Types.ObjectId | null;
  forwardedFrom: Types.ObjectId | null;
  reactions: Map<string, Types.ObjectId[]>;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, default: "" },
    mediaUrl: { type: String, default: null },
    replyTo: { type: Schema.Types.ObjectId, ref: "ChatMessage", default: null },
    forwardedFrom: { type: Schema.Types.ObjectId, ref: "ChatMessage", default: null },
    reactions: {
      type: Map,
      of: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: {},
    },
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ chatId: 1, createdAt: -1 });

export const ChatMessage = model<IChatMessage>("ChatMessage", ChatMessageSchema);
