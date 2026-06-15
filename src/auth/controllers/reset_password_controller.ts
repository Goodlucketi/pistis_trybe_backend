import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import resetPasswordService from "../services/reset_password_service";

const resetPasswordController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword)
      return res.status(400).json({ status: "error", message: "token, email, and newPassword are required." });
    const result = await resetPasswordService({ token, email, newPassword });
    return res.status(result.statusCode).json(result);
  }
);
export default resetPasswordController;
