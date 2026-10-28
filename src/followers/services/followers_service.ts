import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Follow } from "../followers.model";
import { User } from "../../users/users.models";
import { withFollowFlags } from "../../users/services/get_me_service";
import { Notification } from "../../notifications/notifications.models";
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

      // FIX: Create a follow notification for the target user
      const follower = await User.findById(followerId).lean();
      await Notification.create({
        userId: followingId,
        type: "follow",
        title: "New follower",
        body: `${follower?.fullName || "Someone"} started following you.`,
        referenceId: followerId,
        referenceModel: "User",
      });

      return responseHandler("Now following", StatusCodes.OK, { following: true });
    }
  }
);

const assertCanViewConnections = async (viewerId: string, userId: string) => {
  if (!userId || userId === "undefined") {
    throw createError("Invalid user ID", StatusCodes.BadRequest);
  }
  const target = await User.findById(userId).select("_id").lean();
  if (!target) throw createError("User not found", StatusCodes.NotFound);

  if (String(viewerId) === String(userId)) return;

  const [viewerFollows, targetFollows] = await Promise.all([
    Follow.exists({ followerId: viewerId, followingId: userId }),
    Follow.exists({ followerId: userId, followingId: viewerId }),
  ]);

  if (!viewerFollows || !targetFollows) {
    throw createError(
      "You can only see this list when you follow each other.",
      StatusCodes.Forbidden,
    );
  }
};

const listConnections = async ({
  viewerId,
  userId,
  page,
  limit,
  direction,
}: {
  viewerId: string;
  userId: string;
  page: number;
  limit: number;
  direction: "followers" | "following";
}) => {
  await assertCanViewConnections(viewerId, userId);

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const matchField = direction === "followers" ? "followingId" : "followerId";
  const personField = direction === "followers" ? "followerId" : "followingId";

  const [rows, total] = await Promise.all([
    Follow.find({ [matchField]: userId })
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate(personField, "_id fullName avatarUrl biography isActive isBlocked")
      .lean(),
    Follow.countDocuments({ [matchField]: userId }),
  ]);

  const people = rows
    .map((row: any) => row[personField])
    .filter((person: any) => person && person.isActive !== false && !person.isBlocked)
    .map(({ isActive, isBlocked, ...person }: any) => person);

  return {
    users: await withFollowFlags(people, viewerId),
    pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
  };
};

export const getFollowersService = withServiceErrorHandling(
  async ({ viewerId, userId, page = 1, limit = 30 }: { viewerId: string; userId: string; page?: number; limit?: number }) => {
    const data = await listConnections({ viewerId, userId, page, limit, direction: "followers" });
    return responseHandler("Followers fetched", StatusCodes.OK, data);
  }
);

export const getFollowingService = withServiceErrorHandling(
  async ({ viewerId, userId, page = 1, limit = 30 }: { viewerId: string; userId: string; page?: number; limit?: number }) => {
    const data = await listConnections({ viewerId, userId, page, limit, direction: "following" });
    return responseHandler("Following fetched", StatusCodes.OK, data);
  }
);
