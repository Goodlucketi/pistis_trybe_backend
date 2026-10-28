import crypto from "crypto";
import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { generateToken } from "../../utilities/helper_functions";
import { StatusCodes } from "../../utilities/status_codes";
import { app_constants } from "../../configurations/constants";
import { EmailOtp } from "../email_otp.model";
import { hashOtp, issueEmailOtp, OTP_MAX_ATTEMPTS } from "./email_otp_service";

const INVALID_CODE = "That code is incorrect or has expired.";

export const verifyEmailService = withServiceErrorHandling(
  async ({ email, otp }: { email: string; otp: string }) => {
    const user: any = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) throw createError(INVALID_CODE, StatusCodes.BadRequest);

    if (user.isVerified) {
      throw createError("This email is already verified. Please log in.", StatusCodes.BadRequest);
    }

    const record = await EmailOtp.findOne({ userId: user._id });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw createError(INVALID_CODE, StatusCodes.BadRequest);
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await EmailOtp.deleteOne({ _id: record._id });
      throw createError("Too many incorrect attempts. Please request a new code.", StatusCodes.TooManyRequests);
    }

    const expected = Buffer.from(record.codeHash);
    const received = Buffer.from(hashOtp(String(user._id), otp.trim()));
    const matches = expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!matches) {
      record.attempts += 1;
      await record.save();
      throw createError(INVALID_CODE, StatusCodes.BadRequest);
    }

    user.isVerified = true;
    const tokenData = { userId: user._id, email: user.email, role: user.role };
    const accessToken = generateToken(tokenData, app_constants.ACCESS_TOKEN_EXPIRY);
    const refreshToken = generateToken(tokenData, app_constants.REFRESH_TOKEN_EXPIRY);
    user.refreshToken = refreshToken;
    await user.save();
    await EmailOtp.deleteOne({ _id: record._id });

    return responseHandler("Email verified. Welcome to Pistis Trybe!", StatusCodes.OK, {
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        biography: user.biography,
        avatarUrl: user.avatarUrl,
        role: user.role,
        signupMethod: user.signupMethod,
        isActive: user.isActive,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
      },
    });
  },
);

export const resendOtpService = withServiceErrorHandling(async ({ email }: { email: string }) => {
  const generic = "If that account is awaiting verification, a new code has been sent.";
  const user: any = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user || user.isVerified || user.signupMethod !== "direct" || user.isBlocked) {
    return responseHandler(generic, StatusCodes.OK, null);
  }

  try {
    await issueEmailOtp(user);
  } catch (error: any) {
    if (error?.statusCode !== StatusCodes.TooManyRequests) throw error;
  }
  return responseHandler(generic, StatusCodes.OK, null);
});
