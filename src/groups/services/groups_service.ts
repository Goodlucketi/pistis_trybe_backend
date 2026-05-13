import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Group } from "../groups.model";
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