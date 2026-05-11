import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Follow } from "../followers.model";
import { User } from "../../users/users.models";
import { StatusCodes } from "../../utilities/status_codes";

export const toggleFollowService = withServiceErrorHandling(
  async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
    if (!followingId || followingId === "undefined") {
      throw createError("Invalid user ID", StatusCodes.BadRequest);
    }

    if (followerId === followingId) {
      throw createError("You cannot follow yourself", StatusCodes.BadRequest);
    }

    const target = await User.findById(followingId);
    if (!target) throw createError("User not found", StatusCodes.NotFound);

    const existing = await Follow.findOne({ followerId, followingId });

    if (existing) {
      await Follow.deleteOne({ followerId, followingId });
      return responseHandler("Unfollowed", StatusCodes.OK, { following: false });
    } else {
      await Follow.create({ followerId, followingId });
      return responseHandler("Now following", StatusCodes.OK, { following: true });
    }
  }
);

export const getFollowersService = withServiceErrorHandling(
  async ({ userId, page = 1, limit = 30 }: { userId: string; page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const followers = await Follow.find({ followingId: userId })
      .skip(skip)
      .limit(limit)
      .populate("followerId", "_id fullName avatarUrl email")
      .lean();

    const total = await Follow.countDocuments({ followingId: userId });

    return responseHandler("Followers fetched", StatusCodes.OK, {
      followers: followers.map((f: any) => f.followerId),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const getFollowingService = withServiceErrorHandling(
  async ({ userId, page = 1, limit = 30 }: { userId: string; page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const following = await Follow.find({ followerId: userId })
      .skip(skip)
      .limit(limit)
      .populate("followingId", "_id fullName avatarUrl email")
      .lean();

    const total = await Follow.countDocuments({ followerId: userId });

    return responseHandler("Following fetched", StatusCodes.OK, {
      following: following.map((f: any) => f.followingId),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);