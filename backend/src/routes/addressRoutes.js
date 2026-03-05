import express from "express";
import {
  createAddress,
  getUserAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";
import { protect, verifyCSRF } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, verifyCSRF, createAddress);

router.get("/", protect, getUserAddresses);

router.get("/:id", protect, getAddressById);

router.patch("/:id", protect, verifyCSRF, updateAddress);

router.delete("/:id", protect, verifyCSRF, deleteAddress);

router.post("/:id/default", protect, verifyCSRF, setDefaultAddress);

export default router;
