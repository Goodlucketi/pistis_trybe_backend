import { Schema, model, Document, Types } from "mongoose";

/** A numbered point inside a section, e.g. "1. It gives joy to the Father. John 3:16" */
export interface IDevotionalPoint {
  title: string;
  scriptureReferences?: string;
  /** Free text. Lines starting with "* " or "- " are rendered as bullets. */
  body?: string;
}

/** A section heading, e.g. "WHY IS SOUL WINNING IMPORTANT TO GOD?" with its own references and points */
export interface IDevotionalSection {
  heading: string;
  scriptureReferences?: string;
  points: IDevotionalPoint[];
}

export interface IDevotional extends Document {
  seriesTitle: string;          // e.g. "Birthing Conviction Devotional"
  author: string;               // e.g. "Pastor Japheth Joseph"
  topic: string;
  bibleVerseReference: string;  // main scripture, e.g. "Romans 1:16"
  bibleVerse?: string;          // optional verse text
  exhortation: string;          // opening message
  sections: IDevotionalSection[];
  confession?: string;
  prayer?: string;
  // Legacy fields (older devotionals)
  scriptureForMeditation?: string;
  meditationReference?: string;
  date: string;                 // "YYYY-MM-DD" — one devotional per day
  publishedBy: Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema = new Schema<IDevotionalPoint>(
  {
    title: { type: String, required: true, trim: true },
    scriptureReferences: { type: String, trim: true, default: "" },
    body: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const SectionSchema = new Schema<IDevotionalSection>(
  {
    heading: { type: String, required: true, trim: true },
    scriptureReferences: { type: String, trim: true, default: "" },
    points: { type: [PointSchema], default: [] },
  },
  { _id: false }
);

const DevotionalSchema = new Schema<IDevotional>(
  {
    seriesTitle: { type: String, trim: true, default: "Birthing Conviction Devotional" },
    author: { type: String, trim: true, default: "" },
    topic: { type: String, required: true, trim: true },
    bibleVerseReference: { type: String, required: true, trim: true },
    bibleVerse: { type: String, trim: true, default: "" },
    exhortation: { type: String, required: true, trim: true },
    sections: { type: [SectionSchema], default: [] },
    confession: { type: String, trim: true, default: "" },
    prayer: { type: String, trim: true, default: "" },
    scriptureForMeditation: { type: String, trim: true },
    meditationReference: { type: String, trim: true },
    date: { type: String, required: true, unique: true },  // one per day
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DevotionalSchema.index({ date: -1 });
DevotionalSchema.index({ isPublished: 1, date: -1 });

export const Devotional = model<IDevotional>("Devotional", DevotionalSchema);
