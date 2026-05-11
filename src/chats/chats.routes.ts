import { Router } from "express";
import {
  getChats,
  startDirectChat,
  createGroupChat,
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage,
} from "./controllers/chats_controller";
import { uploadSingle } from "../middlewares/upload";

const chatsV1Router = Router();

chatsV1Router.get("/chats", getChats);
chatsV1Router.post("/chats", startDirectChat);
chatsV1Router.post("/chats/groups", createGroupChat);
chatsV1Router.get("/chats/:id/messages", getMessages);
chatsV1Router.post("/chats/:id/messages", uploadSingle, sendMessage);
chatsV1Router.delete("/chats/:id/messages/:msgId", deleteMessage);
chatsV1Router.post("/chats/:id/messages/:msgId/react", reactToMessage);

export default chatsV1Router;
