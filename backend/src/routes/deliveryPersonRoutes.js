import express from "express";
import {
  applyDeliveryPerson,
  getMyDeliveryProfile,
  updateDeliveryProfile,
  getAllDeliveryPersons,
  approveDeliveryPerson,
  rejectDeliveryPerson,
  suspendDeliveryPerson,
} from "../controllers/deliveryPersonController.js";
import {
  authorize,
  protect,
  verifyCSRF,
} from "../middleware/authMiddleware.js";
import upload, {
  processUploadedFiles,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// customer routes
router.post(
  "/apply",
  protect,
  verifyCSRF,
  authorize("customer"),
  upload.fields([
    { name: "govtId", maxCount: 1 },
    { name: "vehicleRegistration", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
  ]),
  processUploadedFiles,
  applyDeliveryPerson,
);

// delivery person routes
router.get("/me", protect, authorize("delivery_man"), getMyDeliveryProfile);

router.patch(
  "/",
  protect,
  verifyCSRF,
  authorize("delivery_man"),
  upload.fields([
    { name: "govtId", maxCount: 1 },
    { name: "vehicleRegistration", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "profilePicture", maxCount: 1 },
  ]),
  processUploadedFiles,
  updateDeliveryProfile,
);

// admin routes
router.get("/", protect, authorize("admin"), getAllDeliveryPersons);

router.patch(
  "/:id/approve",
  protect,
  verifyCSRF,
  authorize("admin"),
  approveDeliveryPerson,
);

router.patch(
  "/:id/reject",
  protect,
  verifyCSRF,
  authorize("admin"),
  rejectDeliveryPerson,
);

router.patch(
  "/:id/suspend",
  protect,
  verifyCSRF,
  authorize("admin"),
  suspendDeliveryPerson,
);

export default router;
