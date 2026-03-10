import express from "express";
import {
  registerUser,
  loginUser,
  googleAuth,
  logoutUser,
  googleAuthToken,
  getMe,
  updateMe,
  changePassword,
  updateAvatar,
  deleteMe,
} from "../controllers/authController.js";
import { protect, verifyCSRF } from "../middleware/authMiddleware.js";
import {
  validate,
  validateRegister,
} from "../middleware/validateMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import upload, {
  processUploadedFiles,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, validateRegister, validate, registerUser);

router.post("/login", authLimiter, loginUser);

router.post("/google", authLimiter, googleAuth);

router.post("/google/token", authLimiter, googleAuthToken);

router.post("/logout", protect, verifyCSRF, logoutUser);

router.get("/me", protect, getMe);

router.patch("/me", protect, verifyCSRF, updateMe);

router.patch("/me/password", protect, verifyCSRF, changePassword);

router.patch(
  "/me/avatar",
  protect,
  verifyCSRF,
  upload.fields([{ name: "profilePicture", maxCount: 1 }]),
  processUploadedFiles,
  updateAvatar,
);

router.delete("/me", protect, verifyCSRF, deleteMe);

export default router;
