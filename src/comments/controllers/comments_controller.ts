import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import { getCommentsService, createCommentService, deleteCommentService } from "../services/comments_service";

export const getComments = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getCommentsService({ postId: req.params.postId, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 });
  return res.status(result.statusCode).json(result);
});

export const createComment = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ status: "error", message: "Comment body is required." });
  const result = await createCommentService({ postId: req.params.postId, userId: (req as any).user.userId, body });
  return res.status(result.statusCode).json(result);
});

export const deleteComment = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await deleteCommentService({ commentId: req.params.commentId, userId: (req as any).user.userId });
  return res.status(result.statusCode).json(result);
});
