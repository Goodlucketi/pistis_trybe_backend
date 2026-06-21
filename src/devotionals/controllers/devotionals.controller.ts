import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import {
  getTodaysDevotionalService, getDevotionalsService, getDevotionalByDateService,
  createDevotionalService, updateDevotionalService, deleteDevotionalService,
  getAllDevotionalsAdminService,
} from "../services/devotionals.service";

// Public
export const getTodaysDevotional = withControllerErrorHandling(async (_req: Request, res: Response) => {
  const result = await getTodaysDevotionalService();
  return res.status(result.statusCode).json(result);
});

export const getDevotionals = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getDevotionalsService({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 });
  return res.status(result.statusCode).json(result);
});

export const getDevotionalByDate = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getDevotionalByDateService(req.params.date);
  return res.status(result.statusCode).json(result);
});

// Admin
export const getAllDevotionalsAdmin = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getAllDevotionalsAdminService({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 });
  return res.status(result.statusCode).json(result);
});

export const createDevotional = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { topic, bibleVerse, bibleVerseReference, exhortation, scriptureForMeditation, meditationReference, date } = req.body;
  if (!topic || !bibleVerse || !bibleVerseReference || !exhortation || !scriptureForMeditation || !meditationReference || !date) {
    return res.status(400).json({ status: "error", message: "All fields are required." });
  }
  const result = await createDevotionalService({
    topic, bibleVerse, bibleVerseReference, exhortation,
    scriptureForMeditation, meditationReference, date,
    publishedBy: (req as any).user.userId,
  });
  return res.status(result.statusCode).json(result);
});

export const updateDevotional = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await updateDevotionalService({ id: req.params.id, updates: req.body });
  return res.status(result.statusCode).json(result);
});

export const deleteDevotional = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await deleteDevotionalService(req.params.id);
  return res.status(result.statusCode).json(result);
});
