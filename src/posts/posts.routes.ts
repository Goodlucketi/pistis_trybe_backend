import { Router } from "express";
import { uploadSingle, uploadMultiple } from "../middlewares/upload";
import {
  // Feed + Posts
  getFeed, createPost, toggleLike, getUserPosts, editPost, deletePost,
  // Group Posts
  getGroupPosts,
  // Groups
  getGroups, getGroupById, joinLeaveGroup, getGroupMembers,
  getMyGroups, createGroup, kickMember, promoteMember, 
  updateGroup, deleteGroup
} from "./controllers/posts_controller";

const postsV1Router = Router();

// ==================== FEED ====================
postsV1Router.get("/feed", getFeed);
postsV1Router.post("/posts", uploadMultiple, createPost);
postsV1Router.post("/posts/:id/like", toggleLike);
postsV1Router.patch("/posts/:id", editPost);
postsV1Router.delete("/posts/:id", deletePost);
postsV1Router.get("/users/:userId/posts", getUserPosts);

// ==================== GROUPS ====================
postsV1Router.get("/groups", getGroups);
postsV1Router.post("/groups", uploadSingle, createGroup);
postsV1Router.get("/groups/my", getMyGroups);
postsV1Router.get("/groups/:id", getGroupById);
postsV1Router.patch("/groups/:id", updateGroup);
postsV1Router.delete("/groups/:id", deleteGroup);
postsV1Router.post("/groups/:id/join", joinLeaveGroup);

// Group members
postsV1Router.get("/groups/:id/members", getGroupMembers);
postsV1Router.delete("/groups/:id/members/:userId", kickMember);
postsV1Router.patch("/groups/:id/members/:userId/promote", promoteMember);

// Group posts - now use unified createPost/deletePost
postsV1Router.get("/groups/:id/posts", getGroupPosts);
postsV1Router.post("/groups/:id/posts", uploadMultiple, createPost); // <-- was createGroupPost
postsV1Router.delete("/groups/:id/posts/:postId", deletePost); // <-- was deleteGroupPost

export default postsV1Router;