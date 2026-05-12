import { Schema, model, Document, Types } from "mongoose";

export interface INote extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  reference: string;  // e.g. "John 3:16"
  translation: string;
  verseText: string;
  sharedToFeed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "" },
    content: { type: String, required: true },
    reference: { type: String, default: "" },
    translation: { type: String, default: "kjv" },
    verseText: { type: String, default: "" },
    sharedToFeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, createdAt: -1 });

export const Note = model<INote>("Note", NoteSchema);