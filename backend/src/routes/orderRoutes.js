import express from "express";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  acceptDelivery,
  rejectDelivery,
  pickupOrder,
  deliverOrder,
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

// Delivery Person Routes
router.post(
  "/:id/accept-delivery",
  protect,
  authorize("delivery_man"),
  verifyCSRF,
  acceptDelivery,
);

router.post(
  "/:id/reject-delivery",
  protect,
  authorize("delivery_man"),
  verifyCSRF,
  rejectDelivery,
);

router.patch(
  "/:id/pickup",
  protect,
  authorize("delivery_man"),
  verifyCSRF,
  pickupOrder,
);

router.patch(
  "/:id/deliver",
  protect,
  authorize("delivery_man"),
  verifyCSRF,
  deliverOrder,
);

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
