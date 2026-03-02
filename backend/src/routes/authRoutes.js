import express from "express";
import {
  registerUser,
  loginUser,
  googleAuth,
  logoutUser,
} from "../controllers/authController.js";
import { protect, verifyCSRF } from "../middleware/authMiddleware.js";
import {
  validate,
  validateRegister,
} from "../middleware/validateMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, validateRegister, validate, registerUser);

router.post("/login", authLimiter, loginUser);

router.post("/google", authLimiter, googleAuth);

router.post("/logout", protect, verifyCSRF, logoutUser);

export default router;
