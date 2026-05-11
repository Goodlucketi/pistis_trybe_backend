import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { toggleFollowService, getFollowersService, getFollowingService } from "../services/followers_service";

export const toggleFollow = withControllerErrorHandling(async (req: Request, res: Response) => {
  const followerId = (req as any).user?.userId;
  const followingId = req.params.id;
  const result = await toggleFollowService({ followerId, followingId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getFollowers = withControllerErrorHandling(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const result = await getFollowersService({ userId: req.params.id, page, limit });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getFollowing = withControllerErrorHandling(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const result = await getFollowingService({ userId: req.params.id, page, limit });
  return responseHandler(result.message, result.statusCode, result.data, res);
});
