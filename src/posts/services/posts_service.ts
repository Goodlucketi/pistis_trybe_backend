import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Post } from "../posts.models";
import { Follow } from "../../followers/followers.model";
import { StatusCodes } from "../../utilities/status_codes";
import { uploadToCloudinary } from "../../configurations/cloudinary";
import { Types } from "mongoose";

export const getFeedService = withServiceErrorHandling(
  async ({
    page = 1,
    limit = 20,
    type = "forYou",
    userId,
  }: {
    page?: number;
    limit?: number;
    type?: "forYou" | "following";
    userId: string;
  }) => {
    const skip = (page - 1) * limit;

    let query: Record<string, any> = { isDeleted: false, visibility: "public" };

    if (type === "following") {
      // Get list of people this user follows
      const follows = await Follow.find({ followerId: userId }).lean();
      const followingIds = follows.map((f) => f.followingId);

      // Include own posts too
      followingIds.push(new Types.ObjectId(userId));

      query.authorId = { $in: followingIds };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "_id fullName avatarUrl email")
      .lean();

    const total = await Post.countDocuments(query);

    return responseHandler("Feed fetched", StatusCodes.OK, {
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const createPostService = withServiceErrorHandling(
  async ({
    userId,
    body,
    title,
    hashtags,
    visibility = "public",
    mediaBuffers = [],
  }: {
    userId: string;
    body: string;
    title?: string;
    hashtags?: string[];
    visibility?: string;
    mediaBuffers?: Buffer[];
  }) => {
    const mediaUrls: string[] = [];

    for (const buffer of mediaBuffers) {
      const result = await uploadToCloudinary(buffer, "pistis_trybe/posts", {
        resource_type: "auto",
      });
      mediaUrls.push(result.secure_url);
    }

    const post = await Post.create({
      authorId: userId,
      body,
      title: title || null,
      hashtags: hashtags || [],
      visibility,
      mediaUrls,
    });

    const populated = await post.populate("authorId", "_id fullName avatarUrl email");

    return responseHandler("Post created", StatusCodes.Created, populated);
  }
);

export const toggleLikeService = withServiceErrorHandling(
  async ({ postId, userId }: { postId: string; userId: string }) => {
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) throw createError("Post not found", StatusCodes.NotFound);

    const userObjectId = new Types.ObjectId(userId);
    const alreadyLiked = post.likes.some((id) => id.equals(userObjectId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => !id.equals(userObjectId));
    } else {
      post.likes.push(userObjectId);
    }

    await post.save();

    return responseHandler(
      alreadyLiked ? "Post unliked" : "Post liked",
      StatusCodes.OK,
      { liked: !alreadyLiked, likesCount: post.likes.length }
    );
  }
);

export const getUserPostsService = withServiceErrorHandling(
  async ({
    targetUserId,
    page = 1,
    limit = 20,
  }: {
    targetUserId: string;
    page?: number;
    limit?: number;
  }) => {
    const skip = (page - 1) * limit;
    const posts = await Post.find({ authorId: targetUserId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "_id fullName avatarUrl email")
      .lean();

    const total = await Post.countDocuments({ authorId: targetUserId, isDeleted: false });

    return responseHandler("User posts fetched", StatusCodes.OK, {
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const editPostService = withServiceErrorHandling(
  async ({ postId, userId, body, title, hashtags }: {
    postId: string; userId: string; body?: string; title?: string; hashtags?: string[];
  }) => {
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
    const post = await Post.findOne({ _id: postId, authorId: userId, isDeleted: false });
    if (!post) throw createError("Post not found or not yours", StatusCodes.NotFound);
    post.isDeleted = true;
    await post.save();
    return responseHandler("Post deleted", StatusCodes.OK, { deleted: true });
  }
);