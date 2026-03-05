import express from "express";
import {
  createDailyPayout,
  updatePayoutStatus,
  getMyPayouts,
  getAllPayouts,
} from "../controllers/dailyPayoutController.js";
import {
  protect,
  authorize,
  verifyCSRF,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Delivery person route
router.get("/my", protect, authorize("delivery_man"), getMyPayouts);

// Admin Routes
router.get("/", protect, authorize("admin"), getAllPayouts);
router.post("/", protect, authorize("admin"), verifyCSRF, createDailyPayout);
router.patch(
  "/:payoutId",
  protect,
  authorize("admin"),
  verifyCSRF,
  updatePayoutStatus,
);

export default router;
