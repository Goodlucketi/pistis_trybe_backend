import {
  createError,
  withServiceErrorHandling,
} from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { hashPassword } from "../../utilities/helper_functions";
import { StatusCodes } from "../../utilities/status_codes";
import { AuthResponses } from "../responses";
import { issueEmailOtp } from "./email_otp_service";

interface IRegisterAttributes {
  email: string;
  password: string;
  role?: "super_admin" | "admin" | "user";
}

const registerUserService = withServiceErrorHandling(
  async (registerPayload: IRegisterAttributes) => {
    const { email, password, role } = registerPayload;
    const normalizedEmail = email.trim().toLowerCase();

    const userExists: any = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      const pendingVerification =
        !userExists.isVerified && userExists.signupMethod === "direct" && !userExists.isBlocked;

      if (!pendingVerification) {
        throw createError(
          AuthResponses.EMAIL_EXISTS_LOGIN,
          StatusCodes.BadRequest,
        );
      }

      userExists.password = await hashPassword(password.trim());
      await userExists.save();
      await issueEmailOtp(userExists);

      return responseHandler(
        AuthResponses.VERIFICATION_CODE_SENT,
        StatusCodes.Created,
        { email: normalizedEmail, requiresVerification: true },
      );
    }

    const newPassword = await hashPassword(password.trim());

    const createUserPayload = {
      email: normalizedEmail,
      password: newPassword,
      isVerified: role === "super_admin" || role === "admin",
      isActive: true,
      isBlocked: false,
      role: role ?? "user",
      signupMethod: "direct",
    };

    const newUser = await User.create(createUserPayload);

    if (!newUser) {
      throw createError(
        AuthResponses.PROCESS_UNSSUCCESSFUL,
        StatusCodes.InternalServerError,
      );
    }

    if (createUserPayload.isVerified) {
      return responseHandler(
        AuthResponses.ADMIN_REGISTRATION_SUCCESSFUL,
        StatusCodes.Created,
        { email: createUserPayload.email, requiresVerification: false },
      );
    }

    try {
      await issueEmailOtp(newUser);
    } catch (error) {
      await User.deleteOne({ _id: newUser._id });
      throw error;
    }

    return responseHandler(
      AuthResponses.VERIFICATION_CODE_SENT,
      StatusCodes.Created,
      { email: createUserPayload.email, requiresVerification: true },
    );
  },
);

export default registerUserService;
