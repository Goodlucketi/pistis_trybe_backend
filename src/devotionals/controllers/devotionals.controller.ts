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

const ALLOWED_FIELDS = [
  "seriesTitle", "author", "topic", "bibleVerseReference", "bibleVerse",
  "exhortation", "sections", "confession", "prayer", "date", "isPublished",
] as const;

const pickFields = (body: Record<string, unknown>) =>
  Object.fromEntries(ALLOWED_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

/** Drops empty sections/points and returns an error message if a section or point is missing its title */
const normalizeSections = (sections: unknown): { sections?: any[]; error?: string } => {
  if (sections === undefined) return {};
  if (!Array.isArray(sections)) return { error: "sections must be an array." };
  const cleaned = [];
  for (const s of sections) {
    const points = (Array.isArray(s?.points) ? s.points : []).filter(
      (p: any) => p?.title?.trim() || p?.body?.trim() || p?.scriptureReferences?.trim()
    );
    if (!s?.heading?.trim() && !points.length && !s?.scriptureReferences?.trim()) continue;
    if (!s?.heading?.trim()) return { error: "Every section needs a heading." };
    if (points.some((p: any) => !p?.title?.trim())) return { error: `Every point in "${s.heading}" needs a title.` };
    cleaned.push({ heading: s.heading, scriptureReferences: s.scriptureReferences ?? "", points });
  }
  return { sections: cleaned };
};

export const createDevotional = withControllerErrorHandling(async (req: Request, res: Response) => {
  const fields: any = pickFields(req.body);
  const { topic, bibleVerseReference, exhortation, date } = fields;
  if (!topic || !bibleVerseReference || !exhortation || !date) {
    return res.status(400).json({ status: "error", message: "Topic, scripture, message and date are required." });
  }
  const { sections, error } = normalizeSections(fields.sections);
  if (error) return res.status(400).json({ status: "error", message: error });
  const result = await createDevotionalService({
    ...fields,
    sections: sections ?? [],
    publishedBy: (req as any).user.userId,
  });
  return res.status(result.statusCode).json(result);
});

export const updateDevotional = withControllerErrorHandling(async (req: Request, res: Response) => {
  const updates: any = pickFields(req.body);
  if (updates.sections !== undefined) {
    const { sections, error } = normalizeSections(updates.sections);
    if (error) return res.status(400).json({ status: "error", message: error });
    updates.sections = sections;
  }
  const result = await updateDevotionalService({ id: req.params.id, updates });
  return res.status(result.statusCode).json(result);
});

export const deleteDevotional = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await deleteDevotionalService(req.params.id);
  return res.status(result.statusCode).json(result);
});
