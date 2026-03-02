import express from "express";
import {
  createIceCream,
  getIceCreams,
  getIceCreamById,
  updateIceCream,
  deleteIceCream,
} from "../controllers/iceCreamController.js";
import {
  protect,
  authorize,
  verifyCSRF,
} from "../middleware/authMiddleware.js";
import upload, {
  processUploadedFiles,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getIceCreams);
router.get("/:id", getIceCreamById);

// Admin Routes
router.post(
  "/",
  protect,
  authorize("admin"),
  verifyCSRF,
  upload.fields([{ name: "iceCreamImage", maxCount: 1 }]),
  processUploadedFiles,
  createIceCream,
);
router.patch(
  "/:id",
  protect,
  authorize("admin"),
  verifyCSRF,
  upload.fields([{ name: "iceCreamImage", maxCount: 1 }]),
  processUploadedFiles,
  updateIceCream,
);
router.delete("/:id", protect, authorize("admin"), verifyCSRF, deleteIceCream);

export default router;
