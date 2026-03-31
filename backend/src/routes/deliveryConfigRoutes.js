import express from "express";
import {
  getDeliveryConfig,
  updateDeliveryConfig,
  previewDeliveryFee,
} from "../controllers/deliveryConfigController.js";
import {
  protect,
  authorize,
  verifyCSRF,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Anyone authenticated can GET config and preview fees (needed by checkout)
router.get("/", protect, getDeliveryConfig);
router.post("/preview", protect, verifyCSRF, previewDeliveryFee);

// Only admin can update config
router.patch(
  "/",
  protect,
  authorize("admin"),
  verifyCSRF,
  updateDeliveryConfig,
);

export default router;
