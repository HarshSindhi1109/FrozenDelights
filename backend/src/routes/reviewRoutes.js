import express from "express";
import {
  createReview,
  getIceCreamReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect, verifyCSRF } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Route
router.get("/:iceCreamId", getIceCreamReviews);

// Customer Routes
router.post("/", protect, verifyCSRF, createReview);
router.put("/:id", protect, verifyCSRF, updateReview);
router.delete("/:id", protect, verifyCSRF, deleteReview);

export default router;
