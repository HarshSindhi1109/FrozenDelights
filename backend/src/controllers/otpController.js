import Otp from "../models/Otp.js";
import User from "../models/User.js";
import crypto from "crypto";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../services/emailService.js";
import { generateToken, generateCsrfToken } from "../utils/generateTokens.js";

export const verifyEmailOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError("Email and OTP are required", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError("Email already verified", 400));
  }

  const otpRecord = await Otp.findOne({
    userId: user._id,
    purpose: "email_verification",
    isUsed: false,
  });

  if (!otpRecord) {
    return next(new AppError("OTP not found", 400));
  }

  if (otpRecord.otpExpires < new Date()) {
    return next(new AppError("OTP expired", 400));
  }

  if (otpRecord.attempts >= 5) {
    return next(new AppError("Maximum OTP attempts exceeded", 403));
  }

  const hashedInput = crypto.createHash("sha256").update(otp).digest("hex");

  const inputBuffer = Buffer.from(hashedInput);
  const storedBuffer = Buffer.from(otpRecord.hashedOtp);

  if (
    inputBuffer.length !== storedBuffer.length ||
    !crypto.timingSafeEqual(inputBuffer, storedBuffer)
  ) {
    await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
    return next(new AppError("Invalid OTP", 400));
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  user.isEmailVerified = true;
  await user.save();

  const token = generateToken(user);
  const csrfToken = generateCsrfToken(token);

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  res
    .status(200)
    .json({ success: true, message: "Email verified successfully" });
});

export const resendOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (user.isEmailVerified) {
    return next(new AppError("Email already verified", 400));
  }

  const existingOtp = await Otp.findOne({
    userId: user._id,
    purpose: "email_verification",
    isUsed: false,
  });

  if (existingOtp && existingOtp.cooldownUntil > new Date()) {
    const remainingSeconds = Math.ceil(
      (existingOtp.cooldownUntil - new Date()) / 1000,
    );

    return next(
      new AppError(
        `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
        429,
      ),
    );
  }

  await Otp.deleteMany({ userId: user._id, purpose: "email_verification" });

  const { otp, hashedOtp, otpExpires } = generateOtp();

  const cooldownUntil = new Date(Date.now() + 60 * 1000);

  await Otp.create({
    userId: user._id,
    hashedOtp,
    otpExpires,
    cooldownUntil,
    purpose: "email_verification",
  });

  await sendOtpEmail(user.email, otp);

  res.status(200).json({
    success: true,
    message: "OTP resent successfully",
    cooldownUntil: 60,
  });
});
