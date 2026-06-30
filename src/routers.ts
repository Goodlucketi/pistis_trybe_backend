import { Router } from "express";
import authV1Router from "./auth/auth.routes";
import usersV1Router from "./users/users.routes";
import postsV1Router from "./posts/posts.routes";
import followersV1Router from "./followers/followers.routes";
import chatsV1Router from "./chats/chats.routes";
import notesv1Router from "./notes/notes.routes";
import commentsV1Router from "./comments/comments.routes";
import notificationsV1Router from "./notifications/notifications.routes";
import adminV1Router from "./admin/admin.routes";
import devotionalsV1Router from "./devotionals/devotionals.routes";
import announcementsV1Router from "./announcements/announcements.routes";

const pistisTribeRouterV1 = Router();

pistisTribeRouterV1.use(authV1Router);
pistisTribeRouterV1.use(usersV1Router);
pistisTribeRouterV1.use(postsV1Router);
pistisTribeRouterV1.use(followersV1Router);
pistisTribeRouterV1.use(chatsV1Router);
pistisTribeRouterV1.use(notesv1Router);
pistisTribeRouterV1.use(commentsV1Router);
pistisTribeRouterV1.use(notificationsV1Router);
pistisTribeRouterV1.use(adminV1Router);
pistisTribeRouterV1.use(devotionalsV1Router);
pistisTribeRouterV1.use(announcementsV1Router);

export { pistisTribeRouterV1 };
