import { withServiceErrorHandling } from "../../middlewares/error_handlers";
import responseHandler from "../../middlewares/response_handler";
import { User } from "../users.models";
import { StatusCodes } from "../../utilities/status_codes";
import { uploadToCloudinary } from "../../configurations/cloudinary";

interface UpdatePayload {
  userId: string;
  fullName?: string;
  biography?: string;
  avatarBuffer?: Buffer;
  avatarMimetype?: string;
}

const updateMeService = withServiceErrorHandling(async (payload: UpdatePayload) => {
  const { userId, fullName, biography, avatarBuffer, avatarMimetype } = payload;

  const updateData: Record<string, any> = {};

  if (fullName !== undefined) updateData.fullName = fullName.trim();
  if (biography !== undefined) updateData.biography = biography.trim();

  if (avatarBuffer) {
    const folder = "pistis_trybe/avatars";
    const resourceType = "image";
    const result = await uploadToCloudinary(avatarBuffer, folder, {
      resource_type: resourceType,
      transformation: [{ width: 400, height: 400, crop: "fill" }],
    });
    updateData.avatarUrl = result.secure_url;
  }

  const updated = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    select: "_id email fullName biography avatarUrl role isVerified isActive createdAt",
  });

  return responseHandler("Profile updated successfully", StatusCodes.OK, updated);
});

export default updateMeService;
