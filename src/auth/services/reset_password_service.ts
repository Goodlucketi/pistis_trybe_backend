import crypto from "crypto";
import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { hashPassword } from "../../utilities/helper_functions";
import { StatusCodes } from "../../utilities/status_codes";

const resetPasswordService = withServiceErrorHandling(
  async ({ token, email, newPassword }: { token: string; email: string; newPassword: string }) => {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user: any = await User.findOne({
      email: email.trim().toLowerCase(),
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) throw createError("Reset link is invalid or has expired.", StatusCodes.BadRequest);

    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = null; // invalidate all sessions
    await user.save();

    return responseHandler("Password reset successfully. Please log in.", StatusCodes.OK, null);
  }
);

export default resetPasswordService;
