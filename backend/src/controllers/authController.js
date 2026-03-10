import User from "../models/User.js";
import bcrypt from "bcrypt";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { OAuth2Client } from "google-auth-library";
import Otp from "../models/Otp.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../services/emailService.js";
import { generateToken, generateCsrfToken } from "../utils/generateTokens.js";
import fs from "fs";

const deleteFileIfExists = async (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  } catch (err) {
    console.error("File deletion error:", err.message);
  }
};

export const registerUser = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return next(new AppError("All fields are required", 400));
  }

  if (password.length < 6) {
    return next(
      new AppError("Password must be at least 6 characters long", 400),
    );
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return next(new AppError("Email or username already exists", 400));
  }

  const user = await User.create({
    username,
    email,
    password,
    authProvider: "local",
  });

  const existingOtp = await Otp.findOne({
    userId: user._id,
    purpose: "email_verification",
    isUsed: false,
  });

  // ✅ If OTP already exists and cooldown active → block
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

  // Generate new OTP
  const { otp, hashedOtp, otpExpires } = generateOtp();

  const cooldownUntil = new Date(Date.now() + 60 * 1000); // 60 sec cooldown

  // If OTP exists → update it instead of deleting
  if (existingOtp) {
    existingOtp.hashedOtp = hashedOtp;
    existingOtp.otpExpires = otpExpires;
    existingOtp.cooldownUntil = cooldownUntil;
    existingOtp.attempts = 0;
    existingOtp.isUsed = false;
    await existingOtp.save();
  } else {
    await Otp.create({
      userId: user._id,
      hashedOtp,
      otpExpires,
      cooldownUntil,
      purpose: "email_verification",
    });
  }

  await sendOtpEmail(user.email, otp);

  res.status(201).json({
    success: true,
    message: "OTP sent to email. Please verify.",
  });
});

export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check user
  const user = await User.findOne({ email }).select("+password");

  if (!user || user.isDeleted) {
    return next(new AppError("User not found or has been deleted", 401));
  }

  if (user.authProvider === "google") {
    return next(
      new AppError(
        "This account uses Google sign-in. Please continue with Google.",
        400,
      ),
    );
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(new AppError("Invalid credentials", 401));
  }

  // is email verified?
  if (!user.isEmailVerified) {
    return next(new AppError("Please verify your email first", 403));
  }

  // Generate jwt
  const token = generateToken(user);

  // Generate CSRF token
  const csrfToken = generateCsrfToken(token);

  // Set jwt in HTTPOnly cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  // Set CSRF in normal cookie
  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: true,
    sameSite: "None",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicUrl: user.profilePicUrl,
    },
  });
});

export const logoutUser = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Not authenticated", 401));
  }

  // Invalidate all existing JWTs by increasing tokenVersion
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { tokenVersion: 1 },
  });

  // Clear cookies (must match cookie settings)
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.clearCookie("csrfToken", {
    httpOnly: false,
    secure: true,
    sameSite: "None",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError("Google token is required", 400));
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  const { sub: googleId, email, name, picture, email_verified } = payload;

  if (!email_verified) {
    return next(new AppError("Google email not verified", 400));
  }

  let user = await User.findOne({ email });

  if (user && user.authProvider === "local" && !user.isEmailVerified) {
    return next(new AppError("Your email is not verified.", 403));
  }

  if (user && user.authProvider === "local" && user.isEmailVerified) {
    user.googleId = googleId;
    user.profilePicUrl = user.profilePicUrl || picture;
    await user.save();
  }

  if (!user) {
    user = await User.create({
      username: name.replace(/\s+/g, "").toLowerCase() + Date.now(),
      email,
      googleId,
      authProvider: "google",
      isEmailVerified: true,
      profilePicUrl: picture,
    });
  }

  // Generate jwt
  const token = generateToken(user);

  // Generate CSRF token
  const csrfToken = generateCsrfToken(token);

  // Set jwt in HTTPOnly cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  // Set CSRF in normal cookie
  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: true,
    sameSite: "None",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: "Google authentication successful",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

export const googleAuthToken = catchAsync(async (req, res, next) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return next(new AppError("Google access token is required", 400));
  }

  // Fetch user info from Google using the access token
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return next(new AppError("Failed to verify Google token", 401));
  }

  const {
    sub: googleId,
    email,
    name,
    picture,
    email_verified,
  } = await response.json();

  if (!email_verified) {
    return next(new AppError("Google email not verified", 400));
  }

  let user = await User.findOne({ email });

  if (user && user.authProvider === "local" && !user.isEmailVerified) {
    return next(new AppError("Your email is not verified.", 403));
  }

  if (user && user.authProvider === "local" && user.isEmailVerified) {
    user.googleId = googleId;
    user.profilePicUrl = user.profilePicUrl || picture;
    await user.save();
  }

  if (!user) {
    user = await User.create({
      username: name.replace(/\s+/g, "").toLowerCase() + Date.now(),
      email,
      googleId,
      authProvider: "google",
      isEmailVerified: true,
      profilePicUrl: picture,
    });
  }

  const token = generateToken(user);
  const csrfToken = generateCsrfToken(token);

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: true,
    sameSite: "None",
    maxAge: 2 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: "Google authentication successful",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profilePicUrl: user.profilePicUrl,
    },
  });
});

export const getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) return next(new AppError("User not found", 404));

  res.status(200).json({ success: true, user });
});

export const updateMe = catchAsync(async (req, res, next) => {
  const { username } = req.body;
  if (!username?.trim()) return next(new AppError("Username is required", 400));

  const exists = await User.findOne({
    username: username.trim(),
    _id: { $ne: req.user.id },
  });
  if (exists) return next(new AppError("Username already taken", 400));

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { username: username.trim() },
    { new: true, runValidators: true },
  );
  res.status(200).json({ success: true, user });
});

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch)
    return next(new AppError("Current password is incorrect.", 401));

  if (newPassword.length < 6)
    return next(new AppError("Password must be at least 6 characters.", 400));

  user.password = newPassword; // pre-save hook hashes it
  user.authProvider = "local";
  await user.save();
  res.status(200).json({ success: true, message: "Password updated." });
});

export const updateAvatar = catchAsync(async (req, res, next) => {
  const newFile = req.files?.profilePicture?.[0];
  if (!newFile?.savedPath)
    return next(new AppError("No valid image uploaded.", 400));

  // Delete old avatar if it exists
  const existing = await User.findById(req.user.id);
  await deleteFileIfExists(existing.profilePicUrl);

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { profilePicUrl: newFile.savedPath },
    { new: true },
  );
  res.status(200).json({ success: true, user });
});

export const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { isDeleted: true });
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "None" });
  res.clearCookie("csrfToken", {
    httpOnly: false,
    secure: true,
    sameSite: "None",
  });
  res.status(200).json({ success: true, message: "Account deleted." });
});
