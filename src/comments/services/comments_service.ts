import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Comment } from "../comments.model";
import { Post } from "../../posts/posts.models";
import { Notification } from "../../notifications/notifications.models";
import { GroupMember } from "../../posts/group_member.model";
import { StatusCodes } from "../../utilities/status_codes";
import { Types } from "mongoose";

export const getCommentsService = withServiceErrorHandling(
  async ({ postId, page = 1, limit = 20 }: { postId: string; page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const comments = await Comment.find({ postId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "_id fullName avatarUrl")
      .lean();

    const total = await Comment.countDocuments({ postId, isDeleted: false });
    return responseHandler("Comments fetched", StatusCodes.OK, {
      comments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const createCommentService = withServiceErrorHandling(
  async ({ postId, userId, body }: { postId: string; userId: string; body: string }) => {
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) throw createError("Post not found", StatusCodes.NotFound);

    // If group post, check membership
    if (post.groupId) {
      const membership = await GroupMember.findOne({ groupId: post.groupId, userId });
      if (!membership) throw createError("Only members can comment", StatusCodes.Forbidden);
    }

    const comment = await Comment.create({ postId, authorId: userId, body: body.trim() });
    const populated = await comment.populate("authorId", "_id fullName avatarUrl");

    // Notify post author (if someone else commented)
    if (post.authorId.toString() !== userId) {
      await Notification.create({
        userId: post.authorId,
        type: "post_comment",
        title: "New comment on your post",
        body: `Someone commented on your post.`,
        referenceId: post._id,
        referenceModel: "Post",
      });
    }

    return responseHandler("Comment created", StatusCodes.Created, populated);
  }
);

export const deleteCommentService = withServiceErrorHandling(
  async ({ commentId, userId }: { commentId: string; userId: string }) => {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    if (!comment) throw createError("Comment not found", StatusCodes.NotFound);

    if (comment.authorId.toString() !== userId)
      throw createError("Not authorized", StatusCodes.Forbidden);

    comment.isDeleted = true;
    await comment.save();
    return responseHandler("Comment deleted", StatusCodes.OK, { deleted: true });
  }
);
