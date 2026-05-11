import { Router } from "express";
import authV1Router from "./auth/auth.routes";
import usersV1Router from "./users/users.routes";
import postsV1Router from "./posts/posts.routes";
import groupsV1Router from "./groups/groups.routes";
import followersV1Router from "./followers/followers.routes";
import chatsV1Router from "./chats/chats.routes";

const pistisTribeRouterV1 = Router();

pistisTribeRouterV1.use(authV1Router);
pistisTribeRouterV1.use(usersV1Router);
pistisTribeRouterV1.use(postsV1Router);
pistisTribeRouterV1.use(groupsV1Router);
pistisTribeRouterV1.use(followersV1Router);
pistisTribeRouterV1.use(chatsV1Router);

export { pistisTribeRouterV1 };
