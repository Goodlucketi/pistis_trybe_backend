import { Router } from "express";
import { getNotifications, markNotificationsRead } from "./controllers/notifications_controller";

const notificationsV1Router = Router();

notificationsV1Router.get("/notifications", getNotifications);
notificationsV1Router.patch("/notifications/read", markNotificationsRead);

export default notificationsV1Router;
