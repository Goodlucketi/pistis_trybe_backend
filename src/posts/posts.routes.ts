import { Router } from "express";
import { getFeed, createPost, toggleLike, getUserPosts, editPost, deletePost } from "./controllers/posts_controller";
import { uploadMultiple } from "../middlewares/upload";

const postsV1Router = Router();

postsV1Router.get("/posts", getFeed);
postsV1Router.post("/posts", uploadMultiple, createPost);
postsV1Router.post("/posts/:id/like", toggleLike);
postsV1Router.patch("/posts/:id", editPost);
postsV1Router.delete("/posts/:id", deletePost);
postsV1Router.get("/users/:userId/posts", getUserPosts);

export default postsV1Router;