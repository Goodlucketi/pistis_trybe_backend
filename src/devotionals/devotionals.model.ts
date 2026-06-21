import { Schema, model, Document } from "mongoose";

export interface IDevotional extends Document {
  topic: string;
  bibleVerse: string;
  bibleVerseReference: string;
  exhortation: string;
  scriptureForMeditation: string;
  meditationReference: string;
  date: string;           // "YYYY-MM-DD" — one devotional per day
  publishedBy: Schema.Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DevotionalSchema = new Schema<IDevotional>(
  {
    topic: { type: String, required: true, trim: true },
    bibleVerse: { type: String, required: true, trim: true },
    bibleVerseReference: { type: String, required: true, trim: true },
    exhortation: { type: String, required: true, trim: true },
    scriptureForMeditation: { type: String, required: true, trim: true },
    meditationReference: { type: String, required: true, trim: true },
    date: { type: String, required: true, unique: true },  // one per day
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DevotionalSchema.index({ date: -1 });
DevotionalSchema.index({ isPublished: 1, date: -1 });

export const Devotional = model<IDevotional>("Devotional", DevotionalSchema);
