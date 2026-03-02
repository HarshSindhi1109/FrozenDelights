import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, verifyCSRF, authorize } from "../middleware/authMiddleware.js";
import upload, { processUploadedFiles } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public Routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin Routes
router.post(
  "/",
  protect,
  authorize("admin"),
  verifyCSRF,
  upload.fields([{ name: "categoryImage", maxCount: 1 }]),
  processUploadedFiles,
  createCategory,
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  verifyCSRF,
  upload.fields([{ name: "categoryImage", maxCount: 1 }]),
  processUploadedFiles,
  updateCategory,
);

router.delete("/:id", protect, authorize("admin"), verifyCSRF, deleteCategory);

export default router;
