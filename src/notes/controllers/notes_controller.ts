import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { getNotesService, createNoteService, deleteNoteService, shareNoteToFeedService } from "../services/notes_service";

export const getNotes = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await getNotesService(userId);
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const createNote = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const { title, content, reference, translation, verseText } = req.body;
  const result = await createNoteService({ userId, title, content, reference, translation, verseText });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const deleteNote = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await deleteNoteService({ noteId: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});

export const shareNoteToFeed = withControllerErrorHandling(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const result = await shareNoteToFeedService({ noteId: req.params.id, userId });
  return responseHandler(result.message, result.statusCode, result.data, res);
});