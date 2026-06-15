import { OAuth2Client } from "google-auth-library";
import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { generateToken } from "../../utilities/helper_functions";
import { app_constants } from "../../configurations/constants";
import { StatusCodes } from "../../utilities/status_codes";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (credential: string) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID as string,
  });
  const payload = (ticket as any).getPayload?.() ?? ticket;
  if (!payload) throw new Error("Invalid Google token");
  return payload;
};

export const googleAuthService = withServiceErrorHandling(
  async (credential: string) => {
    const payload = await verifyGoogleToken(credential);

    const { sub: googleId, email, name, picture } = payload;

    if (!email) throw createError("Google account has no email", StatusCodes.BadRequest);

    // Check if user already exists by googleId or email
    let user: any = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // If they signed up with email before, link their Google account
      if (!user.googleId) {
        user.googleId = googleId;
        user.signupMethod = "google";
        if (!user.avatarUrl && picture) user.avatarUrl = picture;
        if (!user.fullName && name) user.fullName = name;
      }
    } else {
      // New user — create account
      user = await User.create({
        email: email.toLowerCase(),
        googleId,
        fullName: name || null,
        avatarUrl: picture || null,
        signupMethod: "google",
        password: null,
        isVerified: true,
        isActive: true,
      });
    }

    const tokenData = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateToken(tokenData, app_constants.ACCESS_TOKEN_EXPIRY);
    const refreshToken = generateToken(tokenData, app_constants.REFRESH_TOKEN_EXPIRY);

    user.refreshToken = refreshToken;
    await user.save();

    const cleanUser = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      biography: user.biography,
      role: user.role,
      signupMethod: user.signupMethod,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };

    return responseHandler("Google authentication successful", StatusCodes.OK, {
      accessToken,
      user: cleanUser,
    });
  }
);