import mongoose from "mongoose";
import config from "../configurations";
import { User } from "../users/users.models";

const run = async () => {
  await mongoose.connect(config.MONGO_URI!);
  const result = await User.updateMany(
    { signupMethod: "direct", isVerified: false },
    { $set: { isVerified: true } },
  );
  console.log(`Marked ${result.modifiedCount} existing direct-signup users as verified.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
