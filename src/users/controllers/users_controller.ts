import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import getMeService from "../services/get_me_service";
import { searchUsersService, getUserByIdService, discoverUsersService } from "../services/get_me_service";
import updateMeService from "../services/update_me_service";

export const getMe = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await getMeService(userId);
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const updateMe = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { fullName, biography } = req.body;
  const file = (req as any).file;
  const result = await updateMeService({
    userId,
    fullName,
    biography,
    avatarBuffer: file?.buffer,
    avatarMimetype: file?.mimetype,
  });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const searchUsers = withControllerErrorHandling(async (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.userId;
  const query = req.query.q as string;
  const result = await searchUsersService({ query, currentUserId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getUserById = withControllerErrorHandling(async (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.userId;
  const result = await getUserByIdService({ userId: req.params.id as string, currentUserId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const discoverUsers = withControllerErrorHandling(async (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await discoverUsersService({ query: req.query.q as string, currentUserId, page, limit });
  return responseHandler(result.message, result.statusCode, result.data, res);
});
