import express from "express";
import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";

import {
  protect,
  authorize,
  verifyCSRF,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Only customers can access cart
router.use(protect, authorize("customer"));

// Cart operations
router.post("/", verifyCSRF, addToCart);
router.get("/", getCart);
router.patch("/", verifyCSRF, updateCartItem);
router.delete("/item", verifyCSRF, removeCartItem);
router.delete("/", verifyCSRF, clearCart);

export default router;
