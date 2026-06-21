import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Devotional } from "../devotionals.model";
import { StatusCodes } from "../../utilities/status_codes";

// ── PUBLIC ────────────────────────────────────────────────────────────────

/** Returns today's devotional. If none exists, returns the most recent one. */
export const getTodaysDevotionalService = withServiceErrorHandling(async () => {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  let devotional = await Devotional.findOne({ date: today, isPublished: true })
    .populate("publishedBy", "_id fullName avatarUrl")
    .lean();

  if (!devotional) {
    devotional = await Devotional.findOne({ isPublished: true })
      .sort({ date: -1 })
      .populate("publishedBy", "_id fullName avatarUrl")
      .lean();
  }

  if (!devotional) {
    return responseHandler("No devotional available", StatusCodes.OK, null);
  }

  return responseHandler("Devotional fetched", StatusCodes.OK, devotional);
});

/** Returns paginated list of all published devotionals (for the community archive) */
export const getDevotionalsService = withServiceErrorHandling(
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const [devotionals, total] = await Promise.all([
      Devotional.find({ isPublished: true })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate("publishedBy", "_id fullName avatarUrl")
        .lean(),
      Devotional.countDocuments({ isPublished: true }),
    ]);
    return responseHandler("Devotionals fetched", StatusCodes.OK, {
      devotionals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

export const getDevotionalByDateService = withServiceErrorHandling(async (date: string) => {
  const devotional = await Devotional.findOne({ date, isPublished: true })
    .populate("publishedBy", "_id fullName avatarUrl")
    .lean();
  if (!devotional) throw createError("No devotional found for this date", StatusCodes.NotFound);
  return responseHandler("Devotional fetched", StatusCodes.OK, devotional);
});

// ── ADMIN ─────────────────────────────────────────────────────────────────

export const createDevotionalService = withServiceErrorHandling(
  async ({
    topic, bibleVerse, bibleVerseReference, exhortation,
    scriptureForMeditation, meditationReference, date, publishedBy,
  }: {
    topic: string; bibleVerse: string; bibleVerseReference: string;
    exhortation: string; scriptureForMeditation: string;
    meditationReference: string; date: string; publishedBy: string;
  }) => {
    // Check if a devotional already exists for this date
    const existing = await Devotional.findOne({ date });
    if (existing) {
      throw createError(
        `A devotional already exists for ${date}. Edit the existing one instead.`,
        StatusCodes.Conflict
      );
    }

    const devotional = await Devotional.create({
      topic, bibleVerse, bibleVerseReference, exhortation,
      scriptureForMeditation, meditationReference, date, publishedBy,
    });

    const populated = await devotional.populate("publishedBy", "_id fullName avatarUrl");
    return responseHandler("Devotional created", StatusCodes.Created, populated);
  }
);

export const updateDevotionalService = withServiceErrorHandling(
  async ({ id, updates }: { id: string; updates: Partial<{ topic: string; bibleVerse: string; bibleVerseReference: string; exhortation: string; scriptureForMeditation: string; meditationReference: string; date: string; isPublished: boolean }> }) => {
    // If date is being changed, check for conflicts
    if (updates.date) {
      const conflict = await Devotional.findOne({ date: updates.date, _id: { $ne: id } });
      if (conflict) throw createError(`A devotional already exists for ${updates.date}`, StatusCodes.Conflict);
    }

    const devotional = await Devotional.findByIdAndUpdate(id, updates, { new: true })
      .populate("publishedBy", "_id fullName avatarUrl");
    if (!devotional) throw createError("Devotional not found", StatusCodes.NotFound);

    return responseHandler("Devotional updated", StatusCodes.OK, devotional);
  }
);

export const deleteDevotionalService = withServiceErrorHandling(async (id: string) => {
  const devotional = await Devotional.findByIdAndDelete(id);
  if (!devotional) throw createError("Devotional not found", StatusCodes.NotFound);
  return responseHandler("Devotional deleted", StatusCodes.OK, { deleted: true });
});

export const getAllDevotionalsAdminService = withServiceErrorHandling(
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;
    const [devotionals, total] = await Promise.all([
      Devotional.find().sort({ date: -1 }).skip(skip).limit(limit)
        .populate("publishedBy", "_id fullName avatarUrl").lean(),
      Devotional.countDocuments(),
    ]);
    return responseHandler("Devotionals fetched", StatusCodes.OK, {
      devotionals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);
