import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import getMeService from "../services/get_me_service";
import { searchUsersService, getUserByIdService } from "../services/get_me_service";
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
  const result = await getUserByIdService(req.params.id);
  return responseHandler(result.message, result.statusCode, result.data, res);
});