import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import forgotPasswordService from "../services/forgot_password_service";

const forgotPasswordController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: "error", message: "Email is required." });
    const result = await forgotPasswordService({ email });
    return res.status(result.statusCode).json(result);
  }
);
export default forgotPasswordController;
