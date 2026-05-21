import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import {
  // Feed + Posts
  getFeedService, 
  createPostService, 
  toggleLikeService,
  getUserPostsService, 
  editPostService, 
  deletePostService,
  // Group Posts
  getGroupPostsService,
  // Groups
  getGroupsService, 
  getGroupByIdService, 
  joinLeaveGroupService,
  getGroupMembersService, 
  getMyGroupsService, 
  createGroupService,
  kickMemberService, 
  promoteMemberService, 
  updateGroupService, 
  deleteGroupService
} from "../services/posts_service";

// ==================== FEED ====================

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
  const groupId = req.params.id || req.body.groupId || null; // <-- pick from params for /groups/:id/posts
  const files = (req as any).files as Express.Multer.File[] || [];
  
  const result = await createPostService({
    userId, 
    body, 
    title,
    hashtags: hashtags ? JSON.parse(hashtags) : [],
    visibility: groupId ? "group" : (visibility || "public"), // <-- force "group" if groupId
    mediaBuffers: files.map((f) => f.buffer),
    groupId,
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

// ==================== GROUP POSTS ====================

export const getGroupPosts = withControllerErrorHandling(async (req: Request, res: Response) => {
  const cursor = req.query.cursor as string;
  const result = await getGroupPostsService({ groupId: req.params.id, cursor });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

// ==================== GROUPS ====================

export const getGroups = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await getGroupsService(userId);
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getGroupById = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await getGroupByIdService({ groupId: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const joinLeaveGroup = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await joinLeaveGroupService({ groupId: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getGroupMembers = withControllerErrorHandling(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const result = await getGroupMembersService({ groupId: req.params.id, page, limit });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getMyGroups = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await getMyGroupsService(userId);
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const createGroup = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { name, description } = req.body;
  const file = (req as any).file;
  const result = await createGroupService({
    userId, name, description,
    coverBuffer: file?.buffer,
  });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const kickMember = withControllerErrorHandling(async (req: Request, res: Response) => {
  const requesterId = (req as any).user?.userId;
  const result = await kickMemberService({ groupId: req.params.id, userId: req.params.userId, requesterId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const promoteMember = withControllerErrorHandling(async (req: Request, res: Response) => {
  const requesterId = (req as any).user?.userId;
  const result = await promoteMemberService({ groupId: req.params.id, userId: req.params.userId, requesterId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const updateGroup = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await updateGroupService({ id: req.params.id, userId, ...req.body });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const deleteGroup = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await deleteGroupService({ id: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});