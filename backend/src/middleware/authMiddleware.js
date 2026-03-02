import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const protect = catchAsync(async (req, res, next) => {
  let token;

  // Read token from HTTPOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError("Not authorized, token missing", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select(
    "_id username email role tokenVersion isDeleted",
  );

  if (!user || user.isDeleted) {
    return next(new AppError("User not found or deleted", 401));
  }

  if (decoded.tokenVersion !== user.tokenVersion) {
    return next(new AppError("Token expired, please login again", 401));
  }

  req.user = user;

  next();
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Access denied", 403));
    }
    next();
  };
};

export const verifyCSRF = (req, res, next) => {
  const csrfFromHeader = req.headers["x-csrf-token"];
  const csrfFromCookie = req.cookies?.csrfToken;
  const jwtToken = req.cookies?.token;

  if (!csrfFromCookie || !csrfFromHeader || !jwtToken) {
    return next(new AppError("CSRF token missing", 403));
  }

  const expected = crypto
    .createHmac("sha256", process.env.CSRF_SECRET)
    .update(jwtToken)
    .digest("hex");

  const csrfBuffer = Buffer.from(csrfFromHeader);
  const expectedBuffer = Buffer.from(expected);

  if (
    csrfBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(csrfBuffer, expectedBuffer)
  ) {
    return next(new AppError("Invalid CSRF token", 403));
  }

  next();
};
