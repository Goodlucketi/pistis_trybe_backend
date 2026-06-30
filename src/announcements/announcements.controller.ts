import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import {
  getAnnouncementsService, getAllAnnouncementsAdminService,
  createAnnouncementService, updateAnnouncementService, deleteAnnouncementService,
} from "./announcements.service";

export const getAnnouncements = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getAnnouncementsService({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    userId: (req as any).user.userId,
  });
  return res.status(result.statusCode).json(result);
});

export const getAllAnnouncementsAdmin = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getAllAnnouncementsAdminService({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return res.status(result.statusCode).json(result);
});

export const createAnnouncement = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { title, body, targetRole } = req.body;
  if (!title || !body) {
    return res.status(400).json({ status: "error", message: "title and body are required" });
  }
  const result = await createAnnouncementService({
    title, body, targetRole,
    publishedBy: (req as any).user.userId,
    imageBuffer: req.file?.buffer,
  });
  return res.status(result.statusCode).json(result);
});

export const updateAnnouncement = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await updateAnnouncementService({ id: req.params.id, updates: req.body });
  return res.status(result.statusCode).json(result);
});

export const deleteAnnouncement = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await deleteAnnouncementService(req.params.id);
  return res.status(result.statusCode).json(result);
});
