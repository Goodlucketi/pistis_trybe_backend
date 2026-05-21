import { Router } from "express";
import { uploadSingle, uploadMultiple } from "../middlewares/upload";
import {
  getGroups, getGroupById, joinLeaveGroup,
  getGroupMembers, getMyGroups, createGroup,
  getGroupPosts, createGroupPost, deleteGroupPost,
  kickMember, promoteMember, updateGroup, deleteGroup
} from "./controllers/groups_controller";

const groupsV1Router = Router();

groupsV1Router.get("/groups", getGroups);
groupsV1Router.post("/groups", uploadSingle, createGroup);
groupsV1Router.get("/groups/:id", getGroupById);
groupsV1Router.patch("/groups/:id", updateGroup);
groupsV1Router.delete("/groups/:id", deleteGroup);
groupsV1Router.post("/groups/:id/join", joinLeaveGroup);
groupsV1Router.get("/groups/:id/members", getGroupMembers);
groupsV1Router.delete("/groups/:id/members/:userId", kickMember);
groupsV1Router.patch("/groups/:id/members/:userId/promote", promoteMember);

// Posts
groupsV1Router.get("/groups/:id/posts", getGroupPosts);
groupsV1Router.post("/groups/:id/posts", uploadMultiple, createGroupPost);
groupsV1Router.delete("/groups/:id/posts/:postId", deleteGroupPost);

groupsV1Router.get("/users/me/groups", getMyGroups);

export default groupsV1Router;