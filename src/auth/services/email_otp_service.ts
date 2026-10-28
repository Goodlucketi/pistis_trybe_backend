import crypto from "crypto";
import config from "../../configurations";
import { createError } from "../../middlewares/error_handlers";
import { sendMail } from "../../utilities/mailer";
import { otpEmail } from "../../utilities/email_templates";
import { StatusCodes } from "../../utilities/status_codes";
import { EmailOtp } from "../email_otp.model";

export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

export const hashOtp = (userId: string, code: string) =>
  crypto.createHmac("sha256", config.APP_JWT_SECRET!).update(`${userId}:${code}`).digest("hex");

export const issueEmailOtp = async (user: { _id: any; email: string; fullName?: string | null }) => {
  const userId = String(user._id);
  const existing = await EmailOtp.findOne({ userId });

  if (existing) {
    const waitMs = existing.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
    if (waitMs > 0) {
      throw createError(
        `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code.`,
        StatusCodes.TooManyRequests,
      );
    }
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();

  await EmailOtp.findOneAndUpdate(
    { userId },
    {
      codeHash: hashOtp(userId, code),
      attempts: 0,
      lastSentAt: now,
      expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
    },
    { upsert: true },
  );

  const mail = otpEmail(code, OTP_TTL_MINUTES);
  await sendMail({ to: user.email, toName: user.fullName || undefined, ...mail });
};
