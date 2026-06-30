import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Announcement } from "./announcements.model";
import { Notification } from "../../notifications/notifications.models";
import { User } from "../../users/users.models";
import { StatusCodes } from "../../utilities/status_codes";
import { uploadToCloudinary } from "../../configurations/cloudinary";

export const getAnnouncementsService = withServiceErrorHandling(
  async ({ page = 1, limit = 20, userId }: { page?: number; limit?: number; userId: string }) => {
    const skip = (page - 1) * limit;
    const user = await User.findById(userId).select("role").lean();
    const role = (user as any)?.role || "user";

    const query: any = {
      isPublished: true,
      $or: [{ targetRole: "all" }, { targetRole: role }],
    };

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("publishedBy", "_id fullName avatarUrl role")
        .lean(),
      Announcement.countDocuments(query),
    ]);

    return responseHandler("Announcements fetched", StatusCodes.OK, {
      announcements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const getAllAnnouncementsAdminService = withServiceErrorHandling(
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const [announcements, total] = await Promise.all([
      Announcement.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate("publishedBy", "_id fullName avatarUrl").lean(),
      Announcement.countDocuments(),
    ]);
    return responseHandler("Announcements fetched", StatusCodes.OK, {
      announcements,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const createAnnouncementService = withServiceErrorHandling(
  async ({
    title, body, targetRole = "all", publishedBy, imageBuffer,
  }: {
    title: string; body: string; targetRole?: string;
    publishedBy: string; imageBuffer?: Buffer;
  }) => {
    let imageUrl: string | null = null;
    if (imageBuffer) {
      const result = await uploadToCloudinary(imageBuffer, "pistis_trybe/announcements", {
        resource_type: "image",
        transformation: [{ width: 1200, height: 630, crop: "fill" }],
      });
      imageUrl = result.secure_url;
    }

    const announcement = await Announcement.create({ title, body, imageUrl, publishedBy, targetRole: targetRole || "all" });

    // Send in-app notifications
    const userQuery: any = { isBlocked: false };
    if (targetRole && targetRole !== "all") userQuery.role = targetRole;
    const users = await User.find(userQuery).select("_id").lean();

    await Notification.insertMany(
      users.map((u) => ({
        userId: u._id,
        type: "announcement",
        title,
        body: body.substring(0, 120) + (body.length > 120 ? "..." : ""),
        referenceId: announcement._id,
        referenceModel: "Announcement",
      }))
    );

    const populated = await announcement.populate("publishedBy", "_id fullName avatarUrl role");
    return responseHandler("Announcement published", StatusCodes.Created, populated);
  }
);

export const updateAnnouncementService = withServiceErrorHandling(
  async ({ id, updates }: { id: string; updates: Partial<{ title: string; body: string; isPublished: boolean }> }) => {
    const announcement = await Announcement.findByIdAndUpdate(id, updates, { new: true })
      .populate("publishedBy", "_id fullName avatarUrl");
    if (!announcement) throw createError("Announcement not found", StatusCodes.NotFound);
    return responseHandler("Announcement updated", StatusCodes.OK, announcement);
  }
);

export const deleteAnnouncementService = withServiceErrorHandling(async (id: string) => {
  const a = await Announcement.findByIdAndDelete(id);
  if (!a) throw createError("Announcement not found", StatusCodes.NotFound);
  return responseHandler("Announcement deleted", StatusCodes.OK, { deleted: true });
});
