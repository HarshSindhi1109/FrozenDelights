import express from "express";
import { verifyEmailOtp, resendOtp } from "../controllers/otpController.js";
import { otpLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/verify-email", otpLimiter, verifyEmailOtp);
router.post("/resend-otp", otpLimiter, resendOtp);

export default router;
