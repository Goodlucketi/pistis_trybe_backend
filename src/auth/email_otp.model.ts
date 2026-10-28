import { Schema, model, Document, Types } from "mongoose";

export interface IEmailOtp extends Document {
  userId: Types.ObjectId;
  codeHash: string;
  attempts: number;
  lastSentAt: Date;
  expiresAt: Date;
}

const EmailOtpSchema = new Schema<IEmailOtp>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const EmailOtp = model<IEmailOtp>("EmailOtp", EmailOtpSchema);
