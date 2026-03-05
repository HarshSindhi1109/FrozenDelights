import express from "express";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import {
  protect,
  authorize,
  verifyCSRF,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer Routes
router.get("/my", protect, getMyOrders);
router.get("/:id", protect, getOrderById);

router.post("/", protect, verifyCSRF, createOrder);
router.patch("/:id/cancel", protect, verifyCSRF, cancelOrder);

// Admin Routes
router.get("/", protect, authorize("admin"), getAllOrders);
router.patch(
  "/:id",
  protect,
  authorize("admin"),
  verifyCSRF,
  updateOrderStatus,
);

export default router;
