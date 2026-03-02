import rateLimit from "express-rate-limit";

// General api limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Mins
  max: 100,
  message: "Too many requests. Please try again later.",
});

// Strict auth limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later.",
});

// OTP limiter
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: "Too many OTP attempts. Try again later.",
});

// Payment limiter
export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 10, 
  message: "Too many payment attempts. Please try again later.",
});