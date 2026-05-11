import { Router } from "express";
import { toggleFollow, getFollowers, getFollowing } from "./controllers/followers_controller";

const followersV1Router = Router();

followersV1Router.post("/users/:id/follow", toggleFollow);
followersV1Router.get("/users/:id/followers", getFollowers);
followersV1Router.get("/users/:id/following", getFollowing);

export default followersV1Router;
