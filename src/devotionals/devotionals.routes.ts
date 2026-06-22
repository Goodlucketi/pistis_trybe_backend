import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  getTodaysDevotional, getDevotionals, getDevotionalByDate,
  getAllDevotionalsAdmin, createDevotional, updateDevotional, deleteDevotional,
} from "./controllers/devotionals.controller";

const devotionalsRouter = Router();

// Public — any authenticated user
devotionalsRouter.get("/devotionals/today", getTodaysDevotional);
devotionalsRouter.get("/devotionals", getDevotionals);
devotionalsRouter.get("/devotionals/date/:date", getDevotionalByDate);

// Admin only
devotionalsRouter.get("/admin/devotionals", requireAdmin, getAllDevotionalsAdmin);
devotionalsRouter.post("/admin/devotionals", requireAdmin, createDevotional);
devotionalsRouter.patch("/admin/devotionals/:id", requireAdmin, updateDevotional);
devotionalsRouter.delete("/admin/devotionals/:id", requireAdmin, deleteDevotional);

export default devotionalsRouter;
