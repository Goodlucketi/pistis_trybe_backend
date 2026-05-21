import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Group } from "../groups.model";
import { GroupPost } from "../group_posts.model";
import { GroupMember } from "../group_member.model";
import { StatusCodes } from "../../utilities/status_codes";
import { uploadToCloudinary } from "../../configurations/cloudinary";
import { Types } from "mongoose";

export const getGroupsService = withServiceErrorHandling(async (userId: string) => {
  const groups = await Group.find({ isDeleted: false })
    .populate("createdBy", "_id fullName avatarUrl")
    .lean();

  const memberships = await GroupMember.find({ userId }).lean();
  const membershipMap = new Map(
    memberships.map((m) => [m.groupId.toString(), m.role])
  );

  const memberCounts = await GroupMember.aggregate([
    { $group: { _id: "$groupId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]));

  const enriched = groups.map((g) => ({
    ...g,
    userRole: membershipMap.get(g._id.toString()) || "non-member",
    membersCount: countMap.get(g._id.toString()) || 0,
  }));

  return responseHandler("Groups fetched", StatusCodes.OK, enriched);
});

export const getGroupByIdService = withServiceErrorHandling(
  async ({ groupId, userId }: { groupId: string; userId: string }) => {
    const group = await Group.findOne({ _id: groupId, isDeleted: false })
      .populate("createdBy", "_id fullName avatarUrl")
      .lean();

    if (!group) throw createError("Group not found", StatusCodes.NotFound);

    const membership = await GroupMember.findOne({ groupId, userId });
    const membersCount = await GroupMember.countDocuments({ groupId });

    return responseHandler("Group fetched", StatusCodes.OK, {
      ...group,
      userRole: membership?.role || "non-member",
      membersCount,
    });
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
    const members = await GroupMember.find({ groupId })
      .skip(skip)
      .limit(limit)
      .populate("userId", "_id fullName avatarUrl email")
      .lean();

    const total = await GroupMember.countDocuments({ groupId });

    return responseHandler("Members fetched", StatusCodes.OK, {
      members,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const getMyGroupsService = withServiceErrorHandling(async (userId: string) => {
  const memberships = await GroupMember.find({ userId })
    .populate({
      path: "groupId",
      populate: { path: "createdBy", select: "_id fullName avatarUrl" },
    })
    .lean();

  const groups = memberships.map((m: any) => ({
    ...m.groupId,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  return responseHandler("My groups fetched", StatusCodes.OK, groups);
});

export const createGroupService = withServiceErrorHandling(
  async ({
    userId,
    name,
    description,
    coverBuffer,
  }: {
    userId: string;
    name: string;
    description?: string;
    coverBuffer?: Buffer;
  }) => {
    let coverUrl: string | null = null;

    if (coverBuffer) {
      const { uploadToCloudinary } = await import("../../configurations/cloudinary");
      const result = await uploadToCloudinary(coverBuffer, "pistis_trybe/groups", {
        resource_type: "image",
        transformation: [{ width: 800, height: 400, crop: "fill" }],
      });
      coverUrl = result.secure_url;
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || null,
      coverUrl,
      createdBy: userId,
    });

    // Auto-join creator as admin
    await GroupMember.create({ groupId: group._id, userId, role: "admin" });

    const populated = await group.populate("createdBy", "_id fullName avatarUrl");
    return responseHandler("Group created", StatusCodes.Created, populated);
  }
);

export const getGroupPostsService = withServiceErrorHandling(
  async ({ groupId, cursor, limit = 10 }: { groupId: string; cursor?: string; limit?: number }) => {
    const query: any = { groupId, isDeleted: false };
    if (cursor) query._id = { $lt: cursor };

    const posts = await GroupPost.find(query)
    .populate("authorId", "_id fullName avatarUrl")
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    return responseHandler("Group posts fetched", StatusCodes.OK, {
      posts,
      nextCursor: hasMore? posts[posts.length - 1]._id : null
    });
  }
);

export const createGroupPostService = withServiceErrorHandling(
  async ({ groupId, userId, text, files }: { groupId: string; userId: string; text: string; files?: Express.Multer.File[] }) => {
    // Check membership
    const membership = await GroupMember.findOne({ groupId, userId });
    if (!membership) throw createError("Only members can post", StatusCodes.Forbidden);

    const group = await Group.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw createError("Group not found", StatusCodes.NotFound);

    let mediaUrls: string[] = [];
    if (files?.length) {
      const uploads = await Promise.all(
        files.map(f => uploadToCloudinary(f.buffer, "pistis_trybe/group_posts", { resource_type: "auto" }))
      );
      mediaUrls = uploads.map(u => u.secure_url);
    }

    const post = await GroupPost.create({
      groupId,
      authorId: userId,
      body: text.trim(),
      mediaUrls,
    });

    const populated = await post.populate("authorId", "_id fullName avatarUrl");
    return responseHandler("Post created", StatusCodes.Created, populated);
  }
);

export const deleteGroupPostService = withServiceErrorHandling(
  async ({ groupId, postId, userId }: { groupId: string; postId: string; userId: string }) => {
    const post = await GroupPost.findOne({ _id: postId, groupId, isDeleted: false });
    if (!post) throw createError("Post not found", StatusCodes.NotFound);

    const membership = await GroupMember.findOne({ groupId, userId });
    const isAuthor = post.authorId.toString() === userId;
    const isAdmin = membership?.role === "admin";

    if (!isAuthor &&!isAdmin) throw createError("Not authorized", StatusCodes.Forbidden);

    await GroupPost.updateOne({ _id: postId }, { isDeleted: true });
    return responseHandler("Post deleted", StatusCodes.OK, { deleted: true });
  }
);

export const kickMemberService = withServiceErrorHandling(
  async ({ groupId, userId, requesterId }: { groupId: string; userId: string; requesterId: string }) => {
    const requester = await GroupMember.findOne({ groupId, userId: requesterId });
    if (requester?.role!== "admin") throw createError("Only admins can remove members", StatusCodes.Forbidden);

    if (userId === requesterId) throw createError("Cannot remove yourself", StatusCodes.BadRequest);

    await GroupMember.deleteOne({ groupId, userId });
    return responseHandler("Member removed", StatusCodes.OK, { removed: true });
  }
);

export const promoteMemberService = withServiceErrorHandling(
  async ({ groupId, userId, requesterId }: { groupId: string; userId: string; requesterId: string }) => {
    const requester = await GroupMember.findOne({ groupId, userId: requesterId });
    if (requester?.role!== "admin") throw createError("Only admins can promote", StatusCodes.Forbidden);

    await GroupMember.updateOne({ groupId, userId }, { role: "admin" });
    return responseHandler("Member promoted", StatusCodes.OK, { promoted: true });
  }
);

export const updateGroupService = withServiceErrorHandling(
  async ({ id, userId, name, description }: { id: string; userId: string; name?: string; description?: string }) => {
    const membership = await GroupMember.findOne({ groupId: id, userId });
    if (membership?.role!== "admin") throw createError("Only admins can edit", StatusCodes.Forbidden);

    const update: any = {};
    if (name) update.name = name.trim();
    if (description!== undefined) update.description = description?.trim() || null;

    const group = await Group.findOneAndUpdate({ _id: id, isDeleted: false }, update, { new: true });
    if (!group) throw createError("Group not found", StatusCodes.NotFound);

    return responseHandler("Group updated", StatusCodes.OK, group);
  }
);

export const deleteGroupService = withServiceErrorHandling(
  async ({ id, userId }: { id: string; userId: string }) => {
    const membership = await GroupMember.findOne({ groupId: id, userId });
    if (membership?.role!== "admin") throw createError("Only admins can delete", StatusCodes.Forbidden);

    await Group.updateOne({ _id: id }, { isDeleted: true });
    await GroupMember.deleteMany({ groupId: id });
    await GroupPost.updateMany({ groupId: id }, { isDeleted: true });

    return responseHandler("Group deleted", StatusCodes.OK, { deleted: true });
  }
);