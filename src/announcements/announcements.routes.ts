import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  getAnnouncements, getAllAnnouncementsAdmin,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from "./controllers/announcements.controller";
import { uploadSingle } from "../middlewares/upload";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const announcementsRouter = Router();

announcementsRouter.get("/announcements", getAnnouncements);
announcementsRouter.get("/admin/announcements", requireAdmin, getAllAnnouncementsAdmin);
announcementsRouter.post("/admin/announcements", requireAdmin, uploadSingle, createAnnouncement);
announcementsRouter.patch("/admin/announcements/:id", requireAdmin, updateAnnouncement);
announcementsRouter.delete("/admin/announcements/:id", requireAdmin, deleteAnnouncement);

export default announcementsRouter;
