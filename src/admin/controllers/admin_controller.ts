import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import {
  getDashboardStatsService, getAllUsersService, getUserDetailService,
  blockUnblockUserService, changeUserRoleService, deleteUserService, verifyUserService,
  getAllPostsAdminService, adminDeletePostService, restorePostService,
  getAllGroupsAdminService, adminDeleteGroupService, broadcastAnnouncementService,
} from "../services/admin_service";

export const getDashboardStats = withControllerErrorHandling(async (_req: Request, res: Response) => {
  const result = await getDashboardStatsService();
  return res.status(result.statusCode).json(result);
});

export const getAllUsers = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { page, limit, search, role, status, sortBy, sortOrder } = req.query as any;
  const result = await getAllUsersService({ page: Number(page) || 1, limit: Number(limit) || 20, search, role, status, sortBy, sortOrder });
  return res.status(result.statusCode).json(result);
});

export const getUserDetail = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getUserDetailService(req.params.userId);
  return res.status(result.statusCode).json(result);
});

export const blockUser = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await blockUnblockUserService({ targetUserId: req.params.userId, action: "block", adminId: (req as any).user.userId });
  return res.status(result.statusCode).json(result);
});

export const unblockUser = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await blockUnblockUserService({ targetUserId: req.params.userId, action: "unblock", adminId: (req as any).user.userId });
  return res.status(result.statusCode).json(result);
});

export const changeUserRole = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { newRole } = req.body;
  if (!newRole) return res.status(400).json({ status: "error", message: "newRole is required" });
  const result = await changeUserRoleService({ targetUserId: req.params.userId, newRole, requesterId: (req as any).user.userId, requesterRole: (req as any).user.role });
  return res.status(result.statusCode).json(result);
});

export const deleteUser = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await deleteUserService({ targetUserId: req.params.userId, adminId: (req as any).user.userId, requesterRole: (req as any).user.role });
  return res.status(result.statusCode).json(result);
});

export const verifyUser = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await verifyUserService(req.params.userId);
  return res.status(result.statusCode).json(result);
});

export const getAllPosts = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { page, limit, search, status } = req.query as any;
  const result = await getAllPostsAdminService({ page: Number(page) || 1, limit: Number(limit) || 20, search, status });
  return res.status(result.statusCode).json(result);
});

export const deletePost = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await adminDeletePostService({ postId: req.params.postId });
  return res.status(result.statusCode).json(result);
});

export const restorePost = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await restorePostService(req.params.postId);
  return res.status(result.statusCode).json(result);
});

export const getAllGroups = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as any;
  const result = await getAllGroupsAdminService({ page: Number(page) || 1, limit: Number(limit) || 20, search });
  return res.status(result.statusCode).json(result);
});

export const deleteGroup = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await adminDeleteGroupService({ groupId: req.params.groupId });
  return res.status(result.statusCode).json(result);
});

export const broadcastAnnouncement = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { title, body, targetRole } = req.body;
  if (!title || !body) return res.status(400).json({ status: "error", message: "title and body are required" });
  const result = await broadcastAnnouncementService({ title, body, targetRole });
  return res.status(result.statusCode).json(result);
});
