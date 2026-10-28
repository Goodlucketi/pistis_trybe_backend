import { Request, Response } from "express";
import { withControllerErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { verifyEmailService, resendOtpService } from "../services/verify_email_service";

export const verifyEmailController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await verifyEmailService({ email, otp });
    return responseHandler(result.message, result.statusCode, result.data, res);
  },
);

export const resendOtpController = withControllerErrorHandling(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await resendOtpService({ email });
    return responseHandler(result.message, result.statusCode, result.data, res);
  },
);
