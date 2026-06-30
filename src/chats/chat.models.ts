import { Schema, model, Document, Types } from "mongoose";

export interface IChat extends Document {
  type: "direct" | "group";
  participants: Types.ObjectId[];
  name: string | null;          // group chat name
  coverUrl: string | null;      // group chat avatar
  createdBy: Types.ObjectId | null;
  lastMessageAt: Date | null;
  lastMessage: {
    text: string;
    senderId: Types.ObjectId;
    timestamp: Date;
  } | null;
  createdAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ["direct", "group"], default: "direct" },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    name: { type: String, default: null },
    coverUrl: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastMessageAt: { type: Date, default: null },
    lastMessage: {
      type: {
        text: String,
        senderId: { type: Schema.Types.ObjectId, ref: "User" },
        timestamp: Date,
      },
      default: null,
    },
  },
  { timestamps: true }
);

ChatSchema.index({ participants: 1 });
ChatSchema.index({ lastMessageAt: -1 });

export const Chat = model<IChat>("Chat", ChatSchema);
