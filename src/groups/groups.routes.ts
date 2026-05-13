import { Router } from "express";
import { uploadSingle } from "../middlewares/upload";
import {
  getGroups, getGroupById, joinLeaveGroup,
  getGroupMembers, getMyGroups, createGroup,
} from "./controllers/groups_controller";

const groupsV1Router = Router();

groupsV1Router.get("/groups", getGroups);
groupsV1Router.post("/groups", uploadSingle, createGroup);
groupsV1Router.get("/groups/:id", getGroupById);
groupsV1Router.post("/groups/:id/join", joinLeaveGroup);
groupsV1Router.get("/groups/:id/members", getGroupMembers);
groupsV1Router.get("/users/me/groups", getMyGroups);

export default groupsV1Router;