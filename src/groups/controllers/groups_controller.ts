import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import {
  getGroupsService, getGroupByIdService, joinLeaveGroupService,
  getGroupMembersService, getMyGroupsService, createGroupService,
} from "../services/groups_service";

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