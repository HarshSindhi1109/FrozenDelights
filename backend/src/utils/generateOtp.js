import crypto from "crypto";

export const generateOtp = () => {
  const otp = crypto.randomInt(100000, 1000000).toString();

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  const otpExpires = new Date(Date.now() + 90 * 1000);

  return { otp, hashedOtp, otpExpires };
};
