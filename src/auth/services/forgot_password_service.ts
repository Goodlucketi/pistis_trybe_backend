import crypto from "crypto";
import { withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { StatusCodes } from "../../utilities/status_codes";

const forgotPasswordService = withServiceErrorHandling(
  async ({ email }: { email: string }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user: any = await User.findOne({ email: normalizedEmail });

    // Generic response — never reveal if email exists
    const genericMsg = "If an account with that email exists, a reset link has been sent.";

    if (!user || user.singupMethod === "google") {
      return responseHandler(genericMsg, StatusCodes.OK, null);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // TODO: Send email with reset link to user.email
    // Link format: https://yourapp.com/reset-password?token=<rawToken>&email=<email>
    // Until email provider is configured, return token in dev only
    const isDev = process.env.NODE_ENV === "development";
    return responseHandler(genericMsg, StatusCodes.OK, isDev ? { resetToken: rawToken } : null);
  }
);

export default forgotPasswordService;
