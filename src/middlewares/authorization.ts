import { Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../configurations";
import { generateToken } from "../utilities/helper_functions";
import { app_constants } from "../configurations/constants";
import { User } from "../users/users.models";

interface IExcludedEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
}

const EXCLUDED_ENDPOINTS: IExcludedEndpoint[] = [
  { method: "POST", path: "/v1/auth/login" },
  { method: "POST", path: "/v1/auth/register" },
  { method: "POST", path: "/v1/auth/refresh-token" },
    { method: "POST", path: "/v1/auth/google" },  
  { method: "POST", path: "/v1/auth/forgot-password" },
  { method: "POST", path: "/v1/auth/reset-password" }, 
];

// Prefix patterns that require authentication
const PROTECTED_PREFIXES: string[] = [
  "/v1/users",
  "/v1/posts",
  "/v1/groups",
  "/v1/followers",
  "/v1/chats",
  "/v1/notes",
  "/v1/notifications",
  "/v1/comments",
  "/v1/feeds",
];

export const generalAuthFunction = async (
  request: any,
  response: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const currentPath = request.baseUrl + request.path;
    const currentMethod = request.method as IExcludedEndpoint["method"];

    const shouldSkipAuth = EXCLUDED_ENDPOINTS.some(
      (endpoint) =>
        endpoint.method === currentMethod && endpoint.path === currentPath
    );

    if (shouldSkipAuth) return next();

    const requiresAuth = PROTECTED_PREFIXES.some((prefix) =>
      currentPath.startsWith(prefix)
    );

    if (!requiresAuth) return next();

    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      return response.status(401).json({
        status: "error",
        message: "Authentication required. Please login.",
      });
    }

    const authorizationToken = authorizationHeader.split(" ")[1];

    if (!authorizationToken) {
      return response.status(401).json({
        status: "error",
        message: "Malformed authorization header.",
      });
    }

    try {
      const verifiedUser: any = jwt.verify(
        authorizationToken,
        `${config.APP_JWT_SECRET}`
      );

      const userDetails = await User.findById(verifiedUser.data?.userId).select(
        "refreshToken isActive isBlocked role _id email"
      );

      if (!userDetails) {
        return response.status(401).json({
          status: "error",
          message: "User not found, please login again.",
        });
      }

      if (userDetails.isBlocked) {
        return response.status(403).json({
          status: "error",
          message: "Account blocked, please contact admin.",
        });
      }

      if (!userDetails.refreshToken) {
        return response.status(401).json({
          status: "error",
          message: "Session expired. Please login again.",
        });
      }

      request.user = {
        userId: userDetails._id,
        email: userDetails.email,
        role: userDetails.role,
      };
      return next();
    } catch (error: any) {
      if (error.message === "jwt expired") {
        const decodedToken: any = jwt.decode(authorizationToken);

        if (!decodedToken?.data?.userId) {
          return response.status(401).json({ status: "error", message: "Invalid token." });
        }

        const userDetails = await User.findById(decodedToken.data.userId).select(
          "refreshToken isActive isBlocked role _id email"
        );

        if (!userDetails || !userDetails.refreshToken) {
          return response.status(401).json({
            status: "error",
            message: "Session expired. Please login again.",
          });
        }

        if (userDetails.isBlocked) {
          return response.status(403).json({
            status: "error",
            message: "Account blocked, please contact admin.",
          });
        }

        try {
          jwt.verify(userDetails.refreshToken, `${config.APP_JWT_SECRET}`);
        } catch {
          return response.status(401).json({
            status: "error",
            message: "Refresh token expired. Please login again.",
          });
        }

        const tokenPayload = {
          userId: userDetails._id,
          email: userDetails.email,
          role: userDetails.role,
        };

        const newAccessToken = generateToken(tokenPayload, app_constants.ACCESS_TOKEN_EXPIRY);
        const newRefreshToken = generateToken(tokenPayload, app_constants.REFRESH_TOKEN_EXPIRY);

        response.setHeader("x-access-token", newAccessToken);

        await User.findByIdAndUpdate(userDetails._id, { refreshToken: newRefreshToken });

        request.user = tokenPayload;
        return next();
      }

      return response.status(401).json({
        status: "error",
        message: `Invalid token: ${error.message}`,
      });
    }
  } catch (error: any) {
    return response.status(500).json({
      status: "error",
      message: `Internal Server Error: ${error.message}`,
    });
  }
};