import express from "express";
import {
  createDeliveryRating,
  getDeliveryRatings,
  updateDeliveryRating,
  deleteDeliveryRating,
} from "../controllers/deliveryRatingController.js";
import { protect, verifyCSRF } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/:deliveryPersonId", getDeliveryRatings);

// Private
router.post("/", protect, verifyCSRF, createDeliveryRating);
router.put("/:id", protect, verifyCSRF, updateDeliveryRating);
router.delete("/:id", protect, verifyCSRF, deleteDeliveryRating);

export default router;
