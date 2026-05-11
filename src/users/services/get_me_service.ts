import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../users.models";
import { StatusCodes } from "../../utilities/status_codes";

const getMeService = withServiceErrorHandling(async (userId: string) => {
  const user = await User.findById(userId).select(
    "_id email fullName biography avatarUrl role isVerified isActive createdAt"
  );

  if (!user) {
    throw createError("User not found", StatusCodes.NotFound);
  }

  return responseHandler("Profile fetched successfully", StatusCodes.OK, user);
});

export default getMeService;

export const searchUsersService = withServiceErrorHandling(
  async ({ query, currentUserId }: { query: string; currentUserId: string }) => {
    if (!query || query.trim().length < 2) {
      return responseHandler("Users fetched", StatusCodes.OK, []);
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { fullName: { $regex: query.trim(), $options: "i" } },
        { email: { $regex: query.trim(), $options: "i" } },
      ],
    })
      .select("_id fullName email avatarUrl biography")
      .limit(20)
      .lean();

    return responseHandler("Users fetched", StatusCodes.OK, users);
  }
);

export const getUserByIdService = withServiceErrorHandling(async (userId: string) => {
  const user = await User.findById(userId).select(
    "_id email fullName biography avatarUrl role isVerified createdAt"
  );
  if (!user) throw createError("User not found", StatusCodes.NotFound);
  return responseHandler("User fetched", StatusCodes.OK, user);
});