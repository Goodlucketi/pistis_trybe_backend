import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { comparePasswords, hashPassword } from "../../utilities/helper_functions";
import { StatusCodes } from "../../utilities/status_codes";

const changePasswordService = withServiceErrorHandling(
  async ({ userId, currentPassword, newPassword }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) => {
    const user = await User.findById(userId).select("password singupMethod");
    if (!user) throw createError("User not found", StatusCodes.NotFound);

    if (user.singupMethod !== "direct") {
      throw createError("Password change not available for social login accounts", StatusCodes.BadRequest);
    }

    const isValid = await comparePasswords(currentPassword, user.password!);
    if (!isValid) throw createError("Current password is incorrect", StatusCodes.Unauthorized);

    const hashed = await hashPassword(newPassword);
    await User.findByIdAndUpdate(userId, { password: hashed });

    return responseHandler("Password changed successfully", StatusCodes.OK, null);
  }
);

export default changePasswordService;