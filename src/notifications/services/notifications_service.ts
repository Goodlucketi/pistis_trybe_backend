import { withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Notification } from "../notifications.models";
import { StatusCodes } from "../../utilities/status_codes";

export const getNotificationsService = withServiceErrorHandling(
  async ({ userId, page = 1, limit = 20 }: { userId: string; page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return responseHandler("Notifications fetched", StatusCodes.OK, {
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const markNotificationsReadService = withServiceErrorHandling(
  async ({ userId, notificationIds }: { userId: string; notificationIds?: string[] }) => {
    const filter: any = { userId };
    if (notificationIds?.length) filter._id = { $in: notificationIds };

    await Notification.updateMany(filter, { isRead: true });
    return responseHandler("Notifications marked as read", StatusCodes.OK, null);
  }
);
