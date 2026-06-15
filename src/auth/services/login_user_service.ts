import {
  createError,
  withServiceErrorHandling,
} from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import {
  comparePasswords,
  generateToken,
} from "../../utilities/helper_functions";
import { StatusCodes } from "../../utilities/status_codes";
import { AuthResponses } from "../responses";
import { app_constants } from "../../configurations/constants";

const loginUserService = withServiceErrorHandling(
  async (loginPayload: { email: string; password: string }) => {
    const { email, password } = loginPayload;
    const normalizedEmail = email.trim().toLowerCase();

    const user: any = await User.findOne({ email: normalizedEmail }, [
      "_id",
      "email",
      "password",
      "fullName",
      "biography",
      "avatarUrl",
      "role",
      "signupMethod",
      "isActive",
      "isVerified",
      "isBlocked",
    ]);

    if (!user) {
      throw createError(AuthResponses.USER_NOT_FOUND, StatusCodes.NotFound);
    }

    if (user.isBlocked) {
      throw createError(AuthResponses.BLOCKED_ACCOUNT, StatusCodes.Forbidden);
    }

    if (user.signupMethod !== "direct") {
      throw createError(
        // AuthResponses.DIFFERENT_SIGNUP_METHOD,
        `This account uses ${user.signupMethod} login. Please continue with ${user.signupMethod}.`,
        StatusCodes.Forbidden,
      );
    }

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw createError(
        AuthResponses.INVALID_CREDENTIALS,
        StatusCodes.Unauthorized,
      );
    }

    const tokenData = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateToken(
      tokenData,
      app_constants.ACCESS_TOKEN_EXPIRY,
    );

    const refreshToken = generateToken(
      tokenData,
      app_constants.REFRESH_TOKEN_EXPIRY,
    );

    // FIX: was { id: user._id } — must be { _id: user._id }
    await User.updateOne(
      { _id: user._id },
      { refreshToken },
    );

    const cleanedUser = extractUserDetails(user);

    return responseHandler(AuthResponses.SUCCESSFUL_LOGIN, StatusCodes.OK, {
      accessToken,
      user: cleanedUser,
    });
  },
);

const extractUserDetails = (
  userData: Record<string, any>,
): Record<string, any> => {
  return {
    _id: userData._id,
    email: userData.email,
    fullName: userData.fullName,
    biography: userData.biography,
    avatarUrl: userData.avatarUrl,
    role: userData.role,
    signupMethod: userData.signupMethod,
    isActive: userData.isActive,
    isVerified: userData.isVerified,
    isBlocked: userData.isBlocked,
  };
};

export default loginUserService;
