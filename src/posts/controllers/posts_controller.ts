import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import {
  getFeedService, createPostService, toggleLikeService,
  getUserPostsService, editPostService, deletePostService,
} from "../services/posts_service";

export const getFeed = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = (req.query.type as "forYou" | "following") || "forYou";
  const result = await getFeedService({ page, limit, type, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const createPost = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { body, title, hashtags, visibility } = req.body;
  const files = (req as any).files as Express.Multer.File[] || [];
  const result = await createPostService({
    userId, body, title,
    hashtags: hashtags ? JSON.parse(hashtags) : [],
    visibility,
    mediaBuffers: files.map((f) => f.buffer),
  });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const toggleLike = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await toggleLikeService({ postId: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getUserPosts = withControllerErrorHandling(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await getUserPostsService({ targetUserId: req.params.userId, page, limit });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const editPost = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { body, title, hashtags } = req.body;
  const result = await editPostService({
    postId: req.params.id, userId, body, title,
    hashtags: hashtags ? JSON.parse(hashtags) : undefined,
  });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const deletePost = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await deletePostService({ postId: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});