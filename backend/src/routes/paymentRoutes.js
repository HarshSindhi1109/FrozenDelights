import express from "express";
import {
  createRazorPayOrder,
  verifyPayment,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { paymentLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/create-razorpay-order", protect, paymentLimiter, createRazorPayOrder);
router.post("/verify", protect, paymentLimiter, verifyPayment);

export default router;
