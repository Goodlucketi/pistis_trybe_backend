import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import changePasswordService from "../services/change_password_service";

const changePasswordController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;
    const result = await changePasswordService({ userId, currentPassword, newPassword });
    return responseHandler(result.message, result.statusCode, result.data, res);
  }
);

export default changePasswordController;