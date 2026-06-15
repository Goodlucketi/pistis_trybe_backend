import { Router } from "express";
import { getComments, createComment, deleteComment } from "./controllers/comments_controller";

const commentsV1Router = Router();

commentsV1Router.get("/posts/:postId/comments", getComments);
commentsV1Router.post("/posts/:postId/comments", createComment);
commentsV1Router.delete("/posts/:postId/comments/:commentId", deleteComment);

export default commentsV1Router;
