import express from "express";
import {
  createFlavour,
  getFlavours,
  getFlavourById,
  updateFlavour,
  deleteFlavour,
} from "../controllers/flavourController.js";
import { protect, authorize, verifyCSRF } from "../middleware/authMiddleware.js";
import upload, { processUploadedFiles } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getFlavours);
router.get("/:id", getFlavourById);

// Admin routes
router.post(
  "/",
  protect,
  authorize("admin"),
  verifyCSRF,
  upload.fields([{ name: "flavourImage", maxCount: 1 }]),
  processUploadedFiles,
  createFlavour,
);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  verifyCSRF,
  upload.fields([{ name: "flavourImage", maxCount: 1 }]),
  processUploadedFiles,
  updateFlavour,
);
router.delete("/:id", protect, authorize("admin"), verifyCSRF, deleteFlavour);

export default router;
