import { Router } from "express";
import { requireAdmin, requireSuperAdmin } from "../middlewares/requireAdmin";
import {
  getDashboardStats, getAllUsers, getUserDetail, blockUser, unblockUser,
  changeUserRole, deleteUser, verifyUser,
  getAllPosts, deletePost, restorePost,
  getAllGroups, deleteGroup, broadcastAnnouncement,
} from "./controllers/admin_controller";

const adminV1Router = Router();

// All admin routes require at minimum admin role
adminV1Router.use("/admin", requireAdmin);

// Dashboard
adminV1Router.get("/admin/dashboard", getDashboardStats);

// Users
adminV1Router.get("/admin/users", getAllUsers);
adminV1Router.get("/admin/users/:userId", getUserDetail);
adminV1Router.patch("/admin/users/:userId/block", blockUser);
adminV1Router.patch("/admin/users/:userId/unblock", unblockUser);
adminV1Router.patch("/admin/users/:userId/verify", verifyUser);
adminV1Router.patch("/admin/users/:userId/role", requireSuperAdmin, changeUserRole);
adminV1Router.delete("/admin/users/:userId", requireSuperAdmin, deleteUser);

// Posts
adminV1Router.get("/admin/posts", getAllPosts);
adminV1Router.delete("/admin/posts/:postId", deletePost);
adminV1Router.patch("/admin/posts/:postId/restore", restorePost);

// Groups
adminV1Router.get("/admin/groups", getAllGroups);
adminV1Router.delete("/admin/groups/:groupId", deleteGroup);

// Announcements
adminV1Router.post("/admin/announce", broadcastAnnouncement);

export default adminV1Router;
