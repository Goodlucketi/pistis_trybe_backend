import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../../users/users.models";
import { Post } from "../../posts/posts.models";
import { Comment } from "../../comments/comments.model";
import { Group } from "../../posts/groups.model";
import { GroupMember } from "../../posts/group_member.model";
import { Follow } from "../../followers/followers.model";
import { Notification } from "../../notifications/notifications.models";
import { StatusCodes } from "../../utilities/status_codes";
import { Types } from "mongoose";

// DASHBOARD
export const getDashboardStatsService = withServiceErrorHandling(async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const [totalUsers, activeUsers, blockedUsers, totalPosts, totalGroups, totalComments, newUsersToday, newPostsToday] = await Promise.all([
    User.countDocuments(), User.countDocuments({ isBlocked: false }),
    User.countDocuments({ isBlocked: true }), Post.countDocuments({ isDeleted: false }),
    Group.countDocuments({ isDeleted: false }), Comment.countDocuments({ isDeleted: false }),
    User.countDocuments({ createdAt: { $gte: todayStart } }),
    Post.countDocuments({ isDeleted: false, createdAt: { $gte: todayStart } }),
  ]);
  const [userGrowth, postActivity, topPosts] = await Promise.all([
    User.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Post.aggregate([{ $match: { isDeleted: false, createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Post.find({ isDeleted: false }).sort({ "likes.1": -1 }).limit(5).populate("authorId", "_id fullName avatarUrl").lean().then((posts) => posts.map((p: any) => ({ ...p, likesCount: p.likes?.length || 0 }))),
  ]);
  return responseHandler("Stats fetched", StatusCodes.OK, {
    overview: { totalUsers, activeUsers, blockedUsers, totalPosts, totalGroups, totalComments, newUsersToday, newPostsToday },
    userGrowth, postActivity, topPosts,
  });
});

// USERS
export const getAllUsersService = withServiceErrorHandling(
  async ({ page = 1, limit = 20, search = "", role = "", status = "", sortBy = "createdAt", sortOrder = "desc" }: { page?: number; limit?: number; search?: string; role?: string; status?: string; sortBy?: string; sortOrder?: string }) => {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (search) query.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    if (role) query.role = role;
    if (status === "blocked") query.isBlocked = true;
    if (status === "active") query.isBlocked = false;
    if (status === "verified") query.isVerified = true;
    if (status === "unverified") query.isVerified = false;
    const [users, total] = await Promise.all([
      User.find(query).select("-password -refreshToken -passwordResetToken -passwordResetExpires").sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);
    const userIds = users.map((u) => u._id);
    const postCounts = await Post.aggregate([{ $match: { authorId: { $in: userIds }, isDeleted: false } }, { $group: { _id: "$authorId", count: { $sum: 1 } } }]);
    const postMap = new Map(postCounts.map((p) => [p._id.toString(), p.count]));
    return responseHandler("Users fetched", StatusCodes.OK, {
      users: users.map((u: any) => ({ ...u, postsCount: postMap.get(u._id.toString()) || 0 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const getUserDetailService = withServiceErrorHandling(async (userId: string) => {
  const user = await User.findById(userId).select("-password -refreshToken -passwordResetToken -passwordResetExpires").lean();
  if (!user) throw createError("User not found", StatusCodes.NotFound);
  const [postsCount, followersCount, followingCount, commentsCount] = await Promise.all([
    Post.countDocuments({ authorId: userId, isDeleted: false }),
    Follow.countDocuments({ followingId: userId }),
    Follow.countDocuments({ followerId: userId }),
    Comment.countDocuments({ authorId: userId, isDeleted: false }),
  ]);
  const recentPosts = await Post.find({ authorId: userId, isDeleted: false }).sort({ createdAt: -1 }).limit(5).lean();
  return responseHandler("User detail fetched", StatusCodes.OK, { user, stats: { postsCount, followersCount, followingCount, commentsCount }, recentPosts });
});

export const blockUnblockUserService = withServiceErrorHandling(
  async ({ targetUserId, action, adminId }: { targetUserId: string; action: "block" | "unblock"; adminId: string }) => {
    if (targetUserId === adminId) throw createError("Cannot block yourself", StatusCodes.BadRequest);
    const user = await User.findById(targetUserId);
    if (!user) throw createError("User not found", StatusCodes.NotFound);
    if (user.role === "super_admin") throw createError("Cannot block a super admin", StatusCodes.Forbidden);
    user.isBlocked = action === "block";
    if (action === "block") user.refreshToken = null;
    await user.save();
    if (action === "block") {
      await Notification.create({ userId: targetUserId, type: "announcement", title: "Your account has been suspended", body: "Your account has been suspended for violating community guidelines.", referenceId: null, referenceModel: null });
    }
    return responseHandler(action === "block" ? "User blocked" : "User unblocked", StatusCodes.OK, { userId: targetUserId, isBlocked: user.isBlocked });
  }
);

export const changeUserRoleService = withServiceErrorHandling(
  async ({ targetUserId, newRole, requesterId, requesterRole }: { targetUserId: string; newRole: "user" | "admin" | "super_admin"; requesterId: string; requesterRole: string }) => {
    if (targetUserId === requesterId) throw createError("Cannot change your own role", StatusCodes.BadRequest);
    if (newRole === "super_admin" && requesterRole !== "super_admin") throw createError("Only super admins can promote to super admin", StatusCodes.Forbidden);
    const user = await User.findById(targetUserId);
    if (!user) throw createError("User not found", StatusCodes.NotFound);
    if (user.role === "super_admin" && requesterRole !== "super_admin") throw createError("Cannot change a super admin role", StatusCodes.Forbidden);
    const oldRole = user.role;
    user.role = newRole;
    await user.save();
    await Notification.create({ userId: targetUserId, type: "group_role_change", title: "Your account role has been updated", body: `Your role changed from ${oldRole} to ${newRole}.`, referenceId: null, referenceModel: null });
    return responseHandler("Role updated", StatusCodes.OK, { userId: targetUserId, oldRole, newRole });
  }
);

export const deleteUserService = withServiceErrorHandling(
  async ({ targetUserId, adminId, requesterRole }: { targetUserId: string; adminId: string; requesterRole: string }) => {
    if (targetUserId === adminId) throw createError("Cannot delete yourself", StatusCodes.BadRequest);
    const user = await User.findById(targetUserId);
    if (!user) throw createError("User not found", StatusCodes.NotFound);
    if (user.role === "super_admin") throw createError("Cannot delete a super admin", StatusCodes.Forbidden);
    if (user.role === "admin" && requesterRole !== "super_admin") throw createError("Only super admins can delete admins", StatusCodes.Forbidden);
    await Promise.all([Post.updateMany({ authorId: targetUserId }, { isDeleted: true }), Comment.updateMany({ authorId: targetUserId }, { isDeleted: true }), User.findByIdAndDelete(targetUserId)]);
    return responseHandler("User deleted", StatusCodes.OK, { deleted: true });
  }
);

export const verifyUserService = withServiceErrorHandling(async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw createError("User not found", StatusCodes.NotFound);
  user.isVerified = true;
  await user.save();
  return responseHandler("User verified", StatusCodes.OK, { userId, isVerified: true });
});

// POSTS
export const getAllPostsAdminService = withServiceErrorHandling(
  async ({ page = 1, limit = 20, search = "", status = "active" }: { page?: number; limit?: number; search?: string; status?: string }) => {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (status === "active") query.isDeleted = false;
    if (status === "deleted") query.isDeleted = true;
    if (search) query.body = { $regex: search, $options: "i" };
    const [posts, total] = await Promise.all([
      Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("authorId", "_id fullName avatarUrl email").lean(),
      Post.countDocuments(query),
    ]);
    return responseHandler("Posts fetched", StatusCodes.OK, {
      posts: posts.map((p: any) => ({ ...p, likesCount: p.likes?.length || 0 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const adminDeletePostService = withServiceErrorHandling(async ({ postId }: { postId: string }) => {
  const post = await Post.findById(postId);
  if (!post) throw createError("Post not found", StatusCodes.NotFound);
  post.isDeleted = true;
  await post.save();
  await Notification.create({ userId: post.authorId, type: "announcement", title: "Your post was removed", body: "A post was removed by a moderator for violating community guidelines.", referenceId: new Types.ObjectId(postId), referenceModel: "Post" });
  return responseHandler("Post removed", StatusCodes.OK, { deleted: true });
});

export const restorePostService = withServiceErrorHandling(async (postId: string) => {
  const post = await Post.findById(postId);
  if (!post) throw createError("Post not found", StatusCodes.NotFound);
  post.isDeleted = false;
  await post.save();
  return responseHandler("Post restored", StatusCodes.OK, { restored: true });
});

// GROUPS
export const getAllGroupsAdminService = withServiceErrorHandling(
  async ({ page = 1, limit = 20, search = "" }: { page?: number; limit?: number; search?: string }) => {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };
    if (search) query.name = { $regex: search, $options: "i" };
    const [groups, total] = await Promise.all([
      Group.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("createdBy", "_id fullName avatarUrl email").lean(),
      Group.countDocuments(query),
    ]);
    const groupIds = groups.map((g) => g._id);
    const memberCounts = await GroupMember.aggregate([{ $match: { groupId: { $in: groupIds } } }, { $group: { _id: "$groupId", count: { $sum: 1 } } }]);
    const memberMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]));
    return responseHandler("Groups fetched", StatusCodes.OK, {
      groups: groups.map((g: any) => ({ ...g, membersCount: memberMap.get(g._id.toString()) || 0 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const adminDeleteGroupService = withServiceErrorHandling(async ({ groupId }: { groupId: string }) => {
  const group = await Group.findById(groupId);
  if (!group) throw createError("Group not found", StatusCodes.NotFound);
  await Promise.all([Group.findByIdAndUpdate(groupId, { isDeleted: true }), Post.updateMany({ groupId }, { isDeleted: true }), GroupMember.deleteMany({ groupId })]);
  return responseHandler("Group removed", StatusCodes.OK, { deleted: true });
});

// ANNOUNCEMENTS
export const broadcastAnnouncementService = withServiceErrorHandling(
  async ({ title, body, targetRole }: { title: string; body: string; targetRole?: string }) => {
    const query: any = { isBlocked: false };
    if (targetRole) query.role = targetRole;
    const users = await User.find(query).select("_id").lean();
    await Notification.insertMany(users.map((u) => ({ userId: u._id, type: "announcement", title, body, referenceId: null, referenceModel: null })));
    return responseHandler("Announcement sent", StatusCodes.OK, { recipientCount: users.length });
  }
);
