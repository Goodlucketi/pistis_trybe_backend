import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { googleAuthService } from "../services/google_auth_service";

const googleAuthController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        status: "error",
        message: "Google credential is required",
      });
    }

    const result = await googleAuthService(credential);
    return responseHandler(result.message, result.statusCode, result.data, res);
  }
);

export default googleAuthController;