import { Schema, model, Document, Types } from 'mongoose';

export interface IGroupPost extends Document {
  groupId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  mediaUrls: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupPostSchema = new Schema<IGroupPost>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    mediaUrls: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GroupPostSchema.index({ groupId: 1, createdAt: -1 });

export const GroupPost = model<IGroupPost>('GroupPost', GroupPostSchema);