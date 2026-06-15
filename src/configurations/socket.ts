import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { ChatMessage } from "../chats/chat_message.models";
import { Chat } from "../chats/chat.models";

let io: Server;

interface AuthenticatedSocket extends Socket {
  user?: { userId: string; email: string; role: string };
}

// FIX: Track online presence — userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token missing"));

      const decoded: any = jwt.verify(token, process.env.DEV_APP_JWT_SECRET as string ||
        process.env.PRODUCTION_APP_JWT_SECRET as string || "");
      socket.user = {
        userId: decoded.data?.userId,
        email: decoded.data?.email,
        role: decoded.data?.role,
      };
      next();
    } catch (error: any) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.user!.userId;

    // Track online presence
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    if (onlineUsers.get(userId)!.size === 1) {
      socket.broadcast.emit("user:online", { userId });
    }
    // Join personal room (for DMs and notifications)
    socket.join(`user:${userId}`);

    // ── Join / Leave conversation rooms ──
    socket.on("join:conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave:conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ── Send message (save to DB + broadcast) ──
    socket.on(
      "send_message",
      async (payload: {
        conversationId: string;
        body: string;
        mediaUrl?: string;
        replyTo?: string;
      }) => {
        try {
          const { conversationId, body, mediaUrl, replyTo } = payload;

          // Verify user is a participant
          const chat = await Chat.findOne({
            _id: conversationId,
            participants: userId,
          });
          if (!chat) return;

          const message = await ChatMessage.create({
            chatId: conversationId,
            senderId: userId,
            body: body || "",
            mediaUrl: mediaUrl || null,
            replyTo: replyTo || null,
          });

          await Chat.findByIdAndUpdate(conversationId, {
            lastMessageAt: new Date(),
            lastMessage: {
              text: body || (mediaUrl ? "📎 Attachment" : ""),
              senderId: userId,
              timestamp: new Date(),
            },
          });

          const populated = await message.populate("senderId", "_id fullName avatarUrl");

          io.to(`conversation:${conversationId}`).emit("receive_message", populated);

          // Notify other participants who aren't in the room
          chat.participants.forEach((participantId) => {
            if (participantId.toString() !== userId) {
              io.to(`user:${participantId}`).emit("new_message_notification", {
                conversationId,
                message: populated,
              });
            }
          });
        } catch (err) {
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // ── React to message ──
    socket.on(
      "react_message",
      async (payload: { messageId: string; conversationId: string; emoji: string }) => {
        try {
          const { messageId, conversationId, emoji } = payload;
          const message = await ChatMessage.findById(messageId);
          if (!message) return;

          const reactions = message.reactions as Map<string, any[]>;
          for (const [key, users] of reactions.entries()) {
            const filtered = users.filter((id: any) => id.toString() !== userId);
            if (filtered.length === 0) reactions.delete(key);
            else reactions.set(key, filtered);
          }

          const existing = reactions.get(emoji) || [];
          existing.push(userId);
          reactions.set(emoji, existing);
          await message.save();

          io.to(`conversation:${conversationId}`).emit("message_reaction_updated", {
            messageId,
            reactions: Object.fromEntries(reactions),
          });
        } catch (err) {
          socket.emit("error", { message: "Failed to react" });
        }
      }
    );

    // ── Delete message ──
    socket.on(
      "delete_message",
      async (payload: { messageId: string; conversationId: string }) => {
        try {
          const msg = await ChatMessage.findOne({ _id: payload.messageId, senderId: userId });
          if (!msg) return;
          msg.isDeleted = true;
          await msg.save();
          io.to(`conversation:${payload.conversationId}`).emit("message_deleted", {
            messageId: payload.messageId,
          });
        } catch (err) {
          socket.emit("error", { message: "Failed to delete message" });
        }
      }
    );

    // ── Typing indicators ──
    socket.on("typing:start", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("user:typing", { userId, conversationId });
    });

    socket.on("typing:stop", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("user:stopped_typing", { userId, conversationId });
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit("user:offline", { userId });
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

export const isUserOnline = (userId: string): boolean =>
  onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;