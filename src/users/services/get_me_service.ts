import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../users.models";
import { Follow } from "../../followers/followers.model";
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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const withFollowFlags = async (users: any[], currentUserId: string) => {
  const ids = users.map((u) => u._id);
  const [following, followedBy, followerCounts, followingCounts] = await Promise.all([
    Follow.find({ followerId: currentUserId, followingId: { $in: ids } }).select("followingId").lean(),
    Follow.find({ followingId: currentUserId, followerId: { $in: ids } }).select("followerId").lean(),
    Follow.aggregate([{ $match: { followingId: { $in: ids } } }, { $group: { _id: "$followingId", count: { $sum: 1 } } }]),
    Follow.aggregate([{ $match: { followerId: { $in: ids } } }, { $group: { _id: "$followerId", count: { $sum: 1 } } }]),
  ]);

  const followingSet = new Set(following.map((f: any) => String(f.followingId)));
  const followedBySet = new Set(followedBy.map((f: any) => String(f.followerId)));
  const followersMap = new Map(followerCounts.map((c: any) => [String(c._id), c.count]));
  const followingMap = new Map(followingCounts.map((c: any) => [String(c._id), c.count]));

  return users.map((u) => ({
    ...u,
    isFollowing: followingSet.has(String(u._id)),
    followsYou: followedBySet.has(String(u._id)),
    followersCount: followersMap.get(String(u._id)) || 0,
    followingCount: followingMap.get(String(u._id)) || 0,
  }));
};

export const searchUsersService = withServiceErrorHandling(
  async ({ query, currentUserId }: { query: string; currentUserId: string }) => {
    if (!query || query.trim().length < 2) {
      return responseHandler("Users fetched", StatusCodes.OK, []);
    }

    const pattern = escapeRegex(query.trim());
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { fullName: { $regex: pattern, $options: "i" } },
        { email: { $regex: pattern, $options: "i" } },
      ],
    })
      .select("_id fullName email avatarUrl biography")
      .limit(20)
      .lean();

    return responseHandler("Users fetched", StatusCodes.OK, users);
  }
);

export const discoverUsersService = withServiceErrorHandling(
  async ({
    query,
    currentUserId,
    page = 1,
    limit = 20,
  }: {
    query?: string;
    currentUserId: string;
    page?: number;
    limit?: number;
  }) => {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);

    const filter: Record<string, any> = {
      _id: { $ne: currentUserId },
      isActive: true,
      isBlocked: false,
      isVerified: true,
      fullName: { $nin: [null, ""] },
    };

    const trimmed = query?.trim();
    if (trimmed) {
      filter.fullName = { $regex: escapeRegex(trimmed), $options: "i" };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("_id fullName avatarUrl biography")
        .sort(trimmed ? { fullName: 1 } : { createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return responseHandler("People fetched", StatusCodes.OK, {
      users: await withFollowFlags(users, currentUserId),
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
    });
  }
);

export const getUserByIdService = withServiceErrorHandling(
  async ({ userId, currentUserId }: { userId: string; currentUserId: string }) => {
    const user = await User.findById(userId)
      .select("_id email fullName biography avatarUrl role isVerified createdAt")
      .lean();
    if (!user) throw createError("User not found", StatusCodes.NotFound);

    const [enriched] = await withFollowFlags([user], currentUserId);
    const isSelf = String(user._id) === String(currentUserId);
    const canViewConnections = isSelf || (!!enriched?.isFollowing && !!enriched?.followsYou);
    return responseHandler("User fetched", StatusCodes.OK, { ...enriched, canViewConnections });
  }
);
