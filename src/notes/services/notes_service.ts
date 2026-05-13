import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Note } from "../notes.model";
import { Post } from "../../posts/posts.models";
import { StatusCodes } from "../../utilities/status_codes";

export const getNotesService = withServiceErrorHandling(async (userId: string) => {
  const notes = await Note.find({ userId }).sort({ createdAt: -1 }).lean();
  return responseHandler("Notes fetched", StatusCodes.OK, notes);
});

export const createNoteService = withServiceErrorHandling(
  async ({ userId, title, content, reference, translation, verseText }: {
    userId: string; title?: string; content: string;
    reference?: string; translation?: string; verseText?: string;
  }) => {
    const note = await Note.create({
      userId,
      content,
      ...(title && { title }),
      ...(reference && { reference }),
      ...(translation && { translation }),
      ...(verseText && { verseText }),
    });
    return responseHandler("Note created", StatusCodes.Created, note);
  }
);

export const deleteNoteService = withServiceErrorHandling(
  async ({ noteId, userId }: { noteId: string; userId: string }) => {
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) throw createError("Note not found", StatusCodes.NotFound);
    await note.deleteOne();
    return responseHandler("Note deleted", StatusCodes.OK, { deleted: true });
  }
);

export const shareNoteToFeedService = withServiceErrorHandling(
  async ({ noteId, userId }: { noteId: string; userId: string }) => {
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) throw createError("Note not found", StatusCodes.NotFound);

    const body = [
      note.reference ? `📖 ${note.reference} (${note.translation?.toUpperCase()})` : "",
      note.verseText ? `"${note.verseText}"` : "",
      "",
      note.title ? `**${note.title}**` : "",
      note.content,
    ].filter(Boolean).join("\n");

    const post = await Post.create({
      authorId: userId,
      body,
      visibility: "public",
      hashtags: ["bible", "devotional"],
    });

    note.sharedToFeed = true;
    await note.save();

    const populated = await post.populate("authorId", "_id fullName avatarUrl email");
    return responseHandler("Note shared to feed", StatusCodes.Created, populated);
  }
);