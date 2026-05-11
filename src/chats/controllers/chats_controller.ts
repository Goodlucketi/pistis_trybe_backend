import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import {
  getChatsService,
  getOrCreateDirectChatService,
  createGroupChatService,
  getMessagesService,
  sendMessageService,
  deleteMessageService,
  reactToMessageService,
} from "../services/chats_service";

export const getChats = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await getChatsService(userId);
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const startDirectChat = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { targetUserId } = req.body;
  const result = await getOrCreateDirectChatService({ userId, targetUserId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const createGroupChat = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { name, participantIds } = req.body;
  const result = await createGroupChatService({ userId, name, participantIds });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const getMessages = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await getMessagesService({ chatId: req.params.id, userId, page, limit });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const sendMessage = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { body, replyTo } = req.body;
  const file = (req as any).file;
  const result = await sendMessageService({
    chatId: req.params.id,
    userId,
    body,
    mediaBuffer: file?.buffer,
    replyTo,
  });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const deleteMessage = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await deleteMessageService({ messageId: req.params.msgId, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const reactToMessage = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { emoji } = req.body;
  const result = await reactToMessageService({ messageId: req.params.msgId, userId, emoji });
  return responseHandler(result.message, result.statusCode, result.data, res);
});
