import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import { getNotificationsService, markNotificationsReadService } from "../services/notifications_service";

export const getNotifications = withControllerErrorHandling(async (req: Request, res: Response) => {
  const result = await getNotificationsService({
    userId: (req as any).user.userId,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return res.status(result.statusCode).json(result);
});

export const markNotificationsRead = withControllerErrorHandling(async (req: Request, res: Response) => {
  const { notificationIds } = req.body;
  const result = await markNotificationsReadService({
    userId: (req as any).user.userId,
    notificationIds,
  });
  return res.status(result.statusCode).json(result);
});
