import express from "express";
import {
  applyDeliveryPerson,
  getMyDeliveryProfile,
  updateDeliveryProfile,
  getAllDeliveryPersons,
  approveDeliveryPerson,
  rejectDeliveryPerson,
  suspendDeliveryPerson,
  updateAvailability,
  updateLocation,
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
  "/availability",
  protect,
  verifyCSRF,
  authorize("delivery_man"),
  updateAvailability,
);

// Location update — called by useOrderPolling on every GPS change
router.patch(
  "/location",
  protect,
  verifyCSRF,
  authorize("delivery_man"),
  updateLocation,
);

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
