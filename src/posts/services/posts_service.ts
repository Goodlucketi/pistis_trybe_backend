import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Post } from "../posts.models";
import { Group } from "../groups.model";
import { GroupMember } from "../group_member.model";
import { Follow } from "../../followers/followers.model";
import { Notification } from "../../notifications/notifications.models";
import { Comment } from "../../comments/comments.model";
import { StatusCodes } from "../../utilities/status_codes";
import { uploadToCloudinary } from "../../configurations/cloudinary";
import { Types } from "mongoose";

export const getFeedService = withServiceErrorHandling(
  async ({ page = 1, limit = 20, type = "forYou", userId }: { page?: number; limit?: number; type?: "forYou" | "following"; userId: string }) => {
    const skip = (page - 1) * limit;
    let query: Record<string, any> = { isDeleted: false, visibility: "public", groupId: null };
    if (type === "following") {
      const follows = await Follow.find({ followerId: new Types.ObjectId(userId) }).lean();
      const ids = follows.map((f) => f.followingId);
      ids.push(new Types.ObjectId(userId));
      query.authorId = { $in: ids };
    }
    const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("authorId", "_id fullName avatarUrl email").lean();
    const total = await Post.countDocuments(query);
    const postIds = posts.map((p) => p._id);
    const ccs = await Comment.aggregate([{ $match: { postId: { $in: postIds }, isDeleted: false } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]);
    const ccMap = new Map(ccs.map((c) => [c._id.toString(), c.count]));
    const enriched = posts.map((p: any) => ({ ...p, commentsCount: ccMap.get(p._id.toString()) || 0 }));
    return responseHandler("Feed fetched", StatusCodes.OK, { posts: enriched, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }
);

export const createPostService = withServiceErrorHandling(
  async ({ userId, body, title, hashtags, visibility = "public", mediaBuffers = [], groupId = null }: { userId: string; body: string; title?: string; hashtags?: string[]; visibility?: string; mediaBuffers?: Buffer[]; groupId?: string | null }) => {
    if (groupId) {
      const membership = await GroupMember.findOne({ groupId, userId });
      if (!membership) throw createError("Only members can post", StatusCodes.Forbidden);
    }
    const mediaUrls: string[] = [];
    for (const buffer of mediaBuffers) {
      const r = await uploadToCloudinary(buffer, "pistis_trybe/posts", { resource_type: "auto" });
      mediaUrls.push(r.secure_url);
    }
    const post = await Post.create({ authorId: userId, groupId, body, title: title || null, hashtags: hashtags || [], visibility, mediaUrls, type: "post" });
    const populated = await post.populate("authorId", "_id fullName avatarUrl email");
    return responseHandler("Post created", StatusCodes.Created, populated);
  }
);

export const toggleLikeService = withServiceErrorHandling(
  async ({ postId, userId }: { postId: string; userId: string }) => {
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) throw createError("Post not found", StatusCodes.NotFound);
    if (post.groupId) {
      const m = await GroupMember.findOne({ groupId: post.groupId, userId });
      if (!m) throw createError("Only members can like", StatusCodes.Forbidden);
    }
    const uid = new Types.ObjectId(userId);
    const alreadyLiked = post.likes.some((id) => id.equals(uid));
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(uid));
    } else {
      post.likes.push(uid);
      if (post.authorId.toString() !== userId) {
        await Notification.create({ userId: post.authorId, type: "post_like", title: "Someone liked your post", body: "Your post received a new like.", referenceId: post._id, referenceModel: "Post" });
      }
    }
    await post.save();
    return responseHandler(alreadyLiked ? "Post unliked" : "Post liked", StatusCodes.OK, { liked: !alreadyLiked, likesCount: post.likes.length });
  }
);

export const getUserPostsService = withServiceErrorHandling(
  async ({ targetUserId, page = 1, limit = 20 }: { targetUserId: string; page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const q = { authorId: targetUserId, isDeleted: false, groupId: null, visibility: "public" };
    const posts = await Post.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("authorId", "_id fullName avatarUrl email").lean();
    const total = await Post.countDocuments(q);
    const postIds = posts.map((p) => p._id);
    const ccs = await Comment.aggregate([{ $match: { postId: { $in: postIds }, isDeleted: false } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]);
    const ccMap = new Map(ccs.map((c) => [c._id.toString(), c.count]));
    const enriched = posts.map((p: any) => ({ ...p, commentsCount: ccMap.get(p._id.toString()) || 0 }));
    return responseHandler("User posts fetched", StatusCodes.OK, { posts: enriched, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }
);

export const editPostService = withServiceErrorHandling(
  async ({ postId, userId, body, title, hashtags }: { postId: string; userId: string; body?: string; title?: string; hashtags?: string[] }) => {
    const post = await Post.findOne({ _id: postId, authorId: userId, isDeleted: false });
    if (!post) throw createError("Post not found or not yours", StatusCodes.NotFound);
    if (body !== undefined) post.body = body;
    if (title !== undefined) post.title = title;
    if (hashtags !== undefined) post.hashtags = hashtags;
    await post.save();
    const populated = await post.populate("authorId", "_id fullName avatarUrl email");
    return responseHandler("Post updated", StatusCodes.OK, populated);
  }
);

export const deletePostService = withServiceErrorHandling(
  async ({ postId, userId }: { postId: string; userId: string }) => {
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) throw createError("Post not found", StatusCodes.NotFound);
    const isAuthor = post.authorId.toString() === userId;
    let isGroupAdmin = false;
    if (post.groupId) {
      const m = await GroupMember.findOne({ groupId: post.groupId, userId });
      isGroupAdmin = m?.role === "admin";
    }
    if (!isAuthor && !isGroupAdmin) throw createError("Not authorized", StatusCodes.Forbidden);
    post.isDeleted = true;
    await post.save();
    return responseHandler("Post deleted", StatusCodes.OK, { deleted: true });
  }
);

export const getGroupPostsService = withServiceErrorHandling(
  async ({ groupId, cursor, limit = 10 }: { groupId: string; cursor?: string; limit?: number }) => {
    const query: any = { groupId, isDeleted: false, visibility: "group" };
    if (cursor) query._id = { $lt: cursor };
    const posts = await Post.find(query).populate("authorId", "_id fullName avatarUrl").sort({ _id: -1 }).limit(limit + 1).lean();

    const hasMore = posts.length > limit;

    if (hasMore) posts.pop();
    const lastPost = posts[posts.length - 1]; // now typed as possibly undefined
    const nextCursor = hasMore && lastPost ? lastPost._id : null;
    
    return responseHandler("Group posts fetched", StatusCodes.OK, { posts, nextCursor});
  }
);

export const getGroupsService = withServiceErrorHandling(async (userId: string) => {
  const groups = await Group.find({ isDeleted: false }).populate("createdBy", "_id fullName avatarUrl").lean();
  const memberships = await GroupMember.find({ userId }).lean();
  const membershipMap = new Map(memberships.map((m) => [m.groupId.toString(), m.role]));
  const memberCounts = await GroupMember.aggregate([{ $group: { _id: "$groupId", count: { $sum: 1 } } }]);
  const countMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]));
  const enriched = groups.map((g) => ({ ...g, userRole: membershipMap.get(g._id.toString()) || "non-member", membersCount: countMap.get(g._id.toString()) || 0 }));
  return responseHandler("Groups fetched", StatusCodes.OK, enriched);
});

export const getGroupByIdService = withServiceErrorHandling(
  async ({ groupId, userId }: { groupId: string; userId: string }) => {
    const group = await Group.findOne({ _id: groupId, isDeleted: false }).populate("createdBy", "_id fullName avatarUrl").lean();
    if (!group) throw createError("Group not found", StatusCodes.NotFound);
    const membership = await GroupMember.findOne({ groupId, userId });
    const membersCount = await GroupMember.countDocuments({ groupId });
    return responseHandler("Group fetched", StatusCodes.OK, { ...group, userRole: membership?.role || "non-member", membersCount });
  }
);

export const joinLeaveGroupService = withServiceErrorHandling(
  async ({ groupId, userId }: { groupId: string; userId: string }) => {
    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw createError("Group not found", StatusCodes.NotFound);
    const existing = await GroupMember.findOne({ groupId, userId });
    if (existing) {
      await GroupMember.deleteOne({ groupId, userId });
      return responseHandler("Left group", StatusCodes.OK, { joined: false });
    } else {
      await GroupMember.create({ groupId, userId, role: "member" });
      return responseHandler("Joined group", StatusCodes.OK, { joined: true });
    }
  }
);

export const getGroupMembersService = withServiceErrorHandling(
  async ({ groupId, page = 1, limit = 30 }: { groupId: string; page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const members = await GroupMember.find({ groupId }).skip(skip).limit(limit).populate("userId", "_id fullName avatarUrl email").lean();
    const total = await GroupMember.countDocuments({ groupId });
    return responseHandler("Members fetched", StatusCodes.OK, { members, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }
);

export const getMyGroupsService = withServiceErrorHandling(async (userId: string) => {
  const memberships = await GroupMember.find({ userId }).populate({ path: "groupId", populate: { path: "createdBy", select: "_id fullName avatarUrl" } }).lean();
  const groups = memberships.map((m: any) => ({ ...m.groupId, role: m.role, joinedAt: m.joinedAt }));
  return responseHandler("My groups fetched", StatusCodes.OK, groups);
});

export const createGroupService = withServiceErrorHandling(
  async ({ userId, name, description, coverBuffer }: { userId: string; name: string; description?: string; coverBuffer?: Buffer }) => {
    let coverUrl: string | null = null;
    if (coverBuffer) {
      const r = await uploadToCloudinary(coverBuffer, "pistis_trybe/groups", { resource_type: "image", transformation: [{ width: 800, height: 400, crop: "fill" }] });
      coverUrl = r.secure_url;
    }
    const group = await Group.create({ name: name.trim(), description: description?.trim() || null, coverUrl, createdBy: userId });
    await GroupMember.create({ groupId: group._id, userId, role: "admin" });
    const populated = await group.populate("createdBy", "_id fullName avatarUrl");
    return responseHandler("Group created", StatusCodes.Created, populated);
  }
);

export const kickMemberService = withServiceErrorHandling(
  async ({ groupId, userId, requesterId }: { groupId: string; userId: string; requesterId: string }) => {
    const requester = await GroupMember.findOne({ groupId, userId: requesterId });
    if (requester?.role !== "admin") throw createError("Only admins can remove members", StatusCodes.Forbidden);
    if (userId === requesterId) throw createError("Cannot remove yourself", StatusCodes.BadRequest);
    await GroupMember.deleteOne({ groupId, userId });
    return responseHandler("Member removed", StatusCodes.OK, { removed: true });
  }
);

export const promoteMemberService = withServiceErrorHandling(
  async ({ groupId, userId, requesterId }: { groupId: string; userId: string; requesterId: string }) => {
    const requester = await GroupMember.findOne({ groupId, userId: requesterId });
    if (requester?.role !== "admin") throw createError("Only admins can promote", StatusCodes.Forbidden);
    await GroupMember.updateOne({ groupId, userId }, { role: "admin" });
    return responseHandler("Member promoted", StatusCodes.OK, { promoted: true });
  }
);

export const updateGroupService = withServiceErrorHandling(
  async ({ id, userId, name, description }: { id: string; userId: string; name?: string; description?: string }) => {
    const membership = await GroupMember.findOne({ groupId: id, userId });
    if (membership?.role !== "admin") throw createError("Only admins can edit", StatusCodes.Forbidden);
    const update: any = {};
    if (name) update.name = name.trim();
    if (description !== undefined) update.description = description?.trim() || null;
    const group = await Group.findOneAndUpdate({ _id: id, isDeleted: false }, update, { new: true });
    if (!group) throw createError("Group not found", StatusCodes.NotFound);
    return responseHandler("Group updated", StatusCodes.OK, group);
  }
);

export const deleteGroupService = withServiceErrorHandling(
  async ({ id, userId }: { id: string; userId: string }) => {
    const membership = await GroupMember.findOne({ groupId: id, userId });
    if (membership?.role !== "admin") throw createError("Only admins can delete", StatusCodes.Forbidden);
    await Group.updateOne({ _id: id }, { isDeleted: true });
    await GroupMember.deleteMany({ groupId: id });
    await Post.updateMany({ groupId: id }, { isDeleted: true });
    return responseHandler("Group deleted", StatusCodes.OK, { deleted: true });
  }
);
