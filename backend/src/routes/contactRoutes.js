import express from "express";
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  replyToContact,
  deleteContact,
} from "../controllers/contactController.js";
import {
  protect,
  authorize,
  verifyCSRF,
} from "../middleware/authMiddleware.js";
import { contactLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Public Route
router.post("/", contactLimiter, createContact);

// Admin Routes
router.get("/", protect, authorize("admin"), getAllContacts);
router.get("/:id", protect, authorize("admin"), getContactById);

router.post(
  "/:id/reply",
  protect,
  authorize("admin"),
  verifyCSRF,
  replyToContact,
);

router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  verifyCSRF,
  updateContactStatus,
);

router.delete("/:id", protect, authorize("admin"), verifyCSRF, deleteContact);

export default router;
