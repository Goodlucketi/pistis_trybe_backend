import { Router } from "express";
import registerUserController from "./controllers/register_user_controller";
import loginUserController from "./controllers/login_user_controller";
import changePasswordController from "./controllers/change_password_controller";
import googleAuthController from "./controllers/google_auth_controller";
import forgotPasswordController from "./controllers/forgot_password_controller";
import resetPasswordController from "./controllers/reset_password_controller";
import { inputValidator } from "../utilities/helper_functions";
import { loginUserSchema, userRegisterSchemaViaEmail } from "./auth_joi_schema";

const authV1Router = Router();

authV1Router.post("/auth/register", inputValidator(userRegisterSchemaViaEmail), registerUserController);
authV1Router.post("/auth/login", inputValidator(loginUserSchema), loginUserController);
authV1Router.post("/auth/google", googleAuthController);
authV1Router.post("/auth/change-password", changePasswordController);

// FIX: Forgot / reset password endpoints
authV1Router.post("/auth/forgot-password", forgotPasswordController);
authV1Router.post("/auth/reset-password", resetPasswordController);

export default authV1Router;
