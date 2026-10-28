import crypto from "crypto";
import { withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { StatusCodes } from "../../utilities/status_codes";
import { sendMail } from "../../utilities/mailer";
import { resetPasswordEmail } from "../../utilities/email_templates";

const forgotPasswordService = withServiceErrorHandling(
  async ({ email }: { email: string }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const user: any = await User.findOne({ email: normalizedEmail });

    // Generic response — never reveal if email exists
    const genericMsg = "If an account with that email exists, a reset link has been sent.";

    if (!user || user.signupMethod === "google") {
      return responseHandler(genericMsg, StatusCodes.OK, null);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const link = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await sendMail({ to: user.email, toName: user.fullName || undefined, ...resetPasswordEmail(link) });

    return responseHandler(genericMsg, StatusCodes.OK, null);
  }
);

export default forgotPasswordService;
