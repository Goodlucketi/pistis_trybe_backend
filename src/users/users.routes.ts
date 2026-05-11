import { Router } from "express";
import { getMe, updateMe, searchUsers, getUserById } from "./controllers/users_controller";
import { uploadSingle } from "../middlewares/upload";

const usersV1Router = Router();

usersV1Router.get("/users/me", getMe);
usersV1Router.patch("/users/me", uploadSingle, updateMe);
usersV1Router.get("/users/find", searchUsers);

usersV1Router.get("/users/:id", getUserById);

export default usersV1Router;