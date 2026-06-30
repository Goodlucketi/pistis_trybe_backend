import { createError, withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { Chat } from "../chat.models";
import { ChatMessage } from "../chat_message.models";
import { StatusCodes } from "../../utilities/status_codes";
import { Types } from "mongoose";

export const getChatsService = withServiceErrorHandling(async (userId: string) => {
  const chats = await Chat.find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .populate("participants", "_id fullName avatarUrl email")
    .populate("createdBy", "_id fullName avatarUrl")
    .lean();

  // Unread count per chat
  const chatIds = chats.map((c) => c._id);
  const unreadCounts = await ChatMessage.aggregate([
    {
      $match: {
        chatId: { $in: chatIds },
        senderId: { $ne: new Types.ObjectId(userId) },
        isRead: false,
        isDeleted: false,
      },
    },
    { $group: { _id: "$chatId", count: { $sum: 1 } } },
  ]);

  const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

  const enriched = chats.map((c: any) => ({
    ...c,
    unreadCount: unreadMap.get(c._id.toString()) || 0,
  }));

  return responseHandler("Chats fetched", StatusCodes.OK, enriched);
});

export const getOrCreateDirectChatService = withServiceErrorHandling(
  async ({ userId, targetUserId }: { userId: string; targetUserId: string }) => {
    // Find existing direct chat between these two users
    let chat = await Chat.findOne({
      type: "direct",
      participants: { $all: [userId, targetUserId], $size: 2 },
    }).populate("participants", "_id fullName avatarUrl email");

    if (!chat) {
      chat = await Chat.create({
        type: "direct",
        participants: [userId, targetUserId],
      });
      chat = await chat.populate("participants", "_id fullName avatarUrl email");
    }

    return responseHandler("Chat ready", StatusCodes.OK, chat);
  }
);


export const createGroupChatService = withServiceErrorHandling(
  async ({
    userId, name, participantIds, avatarBuffer,
  }: {
    userId: string; name: string; participantIds: string[]; avatarBuffer?: Buffer;
  }) => {
    const allParticipants = Array.from(new Set([userId, ...participantIds]));

    let coverUrl: string | null = null;
    if (avatarBuffer) {
      const { uploadToCloudinary } = await import("../../configurations/cloudinary");
      const result = await uploadToCloudinary(avatarBuffer, "pistis_trybe/group_avatars", {
        resource_type: "image",
        transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
      });
      coverUrl = result.secure_url;
    }

    const chat = await Chat.create({
      type: "group",
      name,
      participants: allParticipants,
      createdBy: userId,
      coverUrl, // ← set on creation
    });

    const populated = await chat.populate("participants", "_id fullName avatarUrl email");
    return responseHandler("Group chat created", StatusCodes.Created, populated);
  }
);

export const getMessagesService = withServiceErrorHandling(
  async ({
    chatId,
    userId,
    page = 1,
    limit = 50,
  }: {
    chatId: string;
    userId: string;
    page?: number;
    limit?: number;
  }) => {
    // Verify user is participant
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw createError("Chat not found or access denied", StatusCodes.NotFound);

    const skip = (page - 1) * limit;
    const messages = await ChatMessage.find({ chatId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "_id fullName avatarUrl")
      .populate("replyTo")
      .lean();

    const total = await ChatMessage.countDocuments({ chatId, isDeleted: false });

    // Mark messages as read
    await ChatMessage.updateMany(
      { chatId, senderId: { $ne: userId }, isRead: false },
      { isRead: true }
    );

    return responseHandler("Messages fetched", StatusCodes.OK, {
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }
);

/**
 * FIX: HTTP sendMessage is now only used for FILE uploads.
 * Text-only messages are sent via the socket (which saves to DB and broadcasts).
 * This prevents the duplicate-save bug where both socket and HTTP wrote the same text message.
 *
 * The endpoint still supports text+file together (e.g. caption on an image),
 * but the frontend should NOT call this endpoint for text-only messages.
 */
export const sendMessageService = withServiceErrorHandling(
  async ({ chatId, userId, body, mediaBuffer, replyTo }: { chatId: string; userId: string; body: string; mediaBuffer?: Buffer; replyTo?: string }) => {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw createError("Chat not found or access denied", StatusCodes.NotFound);

    let mediaUrl: string | null = null;
    if (mediaBuffer) {
      const { uploadToCloudinary } = await import("../../configurations/cloudinary");
      const result = await uploadToCloudinary(mediaBuffer, "pistis_trybe/messages", { resource_type: "auto" });
      mediaUrl = result.secure_url;
    }

    const message = await ChatMessage.create({ chatId, senderId: userId, body: body || "", mediaUrl, replyTo: replyTo || null });
    await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date(), lastMessage: { text: body || (mediaUrl ? "📎 Attachment" : ""), senderId: userId, timestamp: new Date() } });

    const populated = await message.populate("senderId", "_id fullName avatarUrl");

    // Broadcast via socket so other participants receive it in real time
    try {
      const { getIO } = await import("../../configurations/socket");
      const io = getIO();

      io.to(`conversation:${chatId}`).emit("receive_message", populated.toObject());
      
      chat.participants.forEach((pid) => {
        if (pid.toString() !== userId) {
          io.to(`user:${pid}`).emit("new_message_notification", { conversationId: chatId, message: populated.toObject() });
        }
      });
    } catch (socketErr) {
      console.warn("Socket emit failed:", socketErr);
    }

    return responseHandler("Message sent", StatusCodes.Created, populated);
  }
);

export const deleteMessageService = withServiceErrorHandling(
  async ({ messageId, userId }: { messageId: string; userId: string }) => {
    const message = await ChatMessage.findOne({ _id: messageId, senderId: userId });
    if (!message) throw createError("Message not found or not your message", StatusCodes.NotFound);

    message.isDeleted = true;
    await message.save();

    return responseHandler("Message deleted", StatusCodes.OK, { deleted: true });
  }
);

export const reactToMessageService = withServiceErrorHandling(
  async ({
    messageId,
    userId,
    emoji,
  }: {
    messageId: string;
    userId: string;
    emoji: string;
  }) => {
    const message = await ChatMessage.findById(messageId);
    if (!message) throw createError("Message not found", StatusCodes.NotFound);

    const userObjectId = new Types.ObjectId(userId);
    const reactions = message.reactions as Map<string, Types.ObjectId[]>;

    // Remove user from any existing reaction
    for (const [key, users] of reactions.entries()) {
      const filtered = users.filter((id) => !id.equals(userObjectId));
      if (filtered.length === 0) {
        reactions.delete(key);
      } else {
        reactions.set(key, filtered);
      }
    }

    // Add new reaction if it's different
    const existing = reactions.get(emoji);
    if (existing) {
      existing.push(userObjectId);
    } else {
      reactions.set(emoji, [userObjectId]);
    }

    await message.save();

    return responseHandler("Reaction updated", StatusCodes.OK, {
      reactions: Object.fromEntries(reactions),
    });
  }
);