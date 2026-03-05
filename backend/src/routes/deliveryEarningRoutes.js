import express from "express";
import {
  getMyEarnings,
  getUnsettledEarnings,
  getAllEarnings,
} from "../controllers/deliveryEarningController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Delivery person routes
router.get("/my", protect, authorize("delivery_man"), getMyEarnings);
router.get(
  "/my/unsettled",
  protect,
  authorize("delivery_man"),
  getUnsettledEarnings,
);

// Admin route
router.get("/", protect, authorize("admin"), getAllEarnings);

export default router;
