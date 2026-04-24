import DeliveryPerson from "../models/DeliveryPerson.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";
import deleteUploadedFiles from "../utils/deleteUploadedFiles.js";
import fs from "fs";

/* --------------------------------------------------- */
/* Helper: Delete old file safely */
/* --------------------------------------------------- */
const deleteFileIfExists = async (filePath) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error("File deletion error:", err.message);
  }
};

/* =================================================== */
/* CUSTOMER CONTROLLER */
/* =================================================== */

export const applyDeliveryPerson = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  try {
    const existing = await DeliveryPerson.findOne({ userId });

    if (existing) {
      await deleteUploadedFiles(req.files);
      return next(new AppError("You have already applied.", 400));
    }

    const { fullname, phone, vehicleType } = req.body;

    const bankDetails = req.body.bankDetails
      ? JSON.parse(req.body.bankDetails)
      : undefined;

    const deliveryPerson = await DeliveryPerson.create({
      userId,
      fullname,
      phone,
      vehicleType,
      govtIdUrl: req.files.govtId?.[0]?.savedPath,
      drivingLicenseUrl: req.files.drivingLicense?.[0]?.savedPath,
      vehicleRegistrationUrl: req.files.vehicleRegistration?.[0]?.savedPath,
      profilePicUrl: req.files.profilePicture?.[0]?.savedPath,
      bankDetails,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      data: deliveryPerson,
    });
  } catch (error) {
    await deleteUploadedFiles(req.files);
    return next(error);
  }
});

/* =================================================== */
/* DELIVERY PERSON CONTROLLERS */
/* =================================================== */

export const getMyDeliveryProfile = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  res.status(200).json({
    success: true,
    data: deliveryPerson.toSafeObject(),
  });
});

/* --------------------------------------------------- */
/* Update Profile (Safe + File Replacement) */
/* --------------------------------------------------- */

export const updateDeliveryProfile = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson) {
    await deleteUploadedFiles(req.files);
    return next(new AppError("Delivery profile not found", 404));
  }

  if (deliveryPerson.status !== "active") {
    await deleteUploadedFiles(req.files);
    return next(
      new AppError(
        "Only active delivery persons can update their profile.",
        403,
      ),
    );
  }

  /* --------- Update normal fields --------- */
  const allowedFields = ["fullname", "phone", "vehicleType"];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      deliveryPerson[field] = req.body[field];
    }
  });

  /* --------- Update bank details safely --------- */
  if (req.body.bankDetails) {
    const parsedBankDetails =
      typeof req.body.bankDetails === "string"
        ? JSON.parse(req.body.bankDetails)
        : req.body.bankDetails;

    Object.keys(parsedBankDetails).forEach((key) => {
      deliveryPerson.bankDetails[key] = parsedBankDetails[key];
    });
  }

  /* --------- Handle File Replacements --------- */

  if (req.files?.govtId?.[0]) {
    await deleteFileIfExists(deliveryPerson.govtIdUrl);
    deliveryPerson.govtIdUrl = req.files.govtId[0].savedPath;
  }

  if (req.files?.drivingLicense?.[0]) {
    await deleteFileIfExists(deliveryPerson.drivingLicenseUrl);
    deliveryPerson.drivingLicenseUrl = req.files.drivingLicense[0].savedPath;
  }

  if (req.files?.vehicleRegistration?.[0]) {
    await deleteFileIfExists(deliveryPerson.vehicleRegistrationUrl);
    deliveryPerson.vehicleRegistrationUrl =
      req.files.vehicleRegistration[0].savedPath;
  }

  if (req.files?.profilePicture?.[0]) {
    await deleteFileIfExists(deliveryPerson.profilePicUrl);
    deliveryPerson.profilePicUrl = req.files.profilePicture[0].savedPath;
  }

  await deliveryPerson.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});

/* --------------------------------------------------- */
/* Update Availability (online / offline) */
/* --------------------------------------------------- */

export const updateAvailability = catchAsync(async (req, res, next) => {
  const { availability } = req.body;

  if (!["online", "offline"].includes(availability)) {
    return next(
      new AppError("Availability must be 'online' or 'offline'", 400),
    );
  }

  const deliveryPerson = await DeliveryPerson.findOne({ userId: req.user.id });

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  if (deliveryPerson.status !== "active") {
    return next(
      new AppError("Only active delivery persons can change availability", 403),
    );
  }

  if (deliveryPerson.availability === "busy") {
    return next(
      new AppError(
        "Cannot change availability while on an active delivery",
        400,
      ),
    );
  }

  deliveryPerson.availability = availability;
  await deliveryPerson.save();

  res.status(200).json({
    success: true,
    message: `You are now ${availability}`,
    data: { availability },
  });
});

/* --------------------------------------------------- */
/* Update Location (called by useOrderPolling GPS watch) */
/* --------------------------------------------------- */

export const updateLocation = catchAsync(async (req, res, next) => {
  const { coordinates } = req.body; // expects [longitude, latitude]

  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    coordinates.some((c) => typeof c !== "number")
  ) {
    return next(new AppError("coordinates must be [longitude, latitude]", 400));
  }

  const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
    { userId: req.user.id },
    {
      location: { type: "Point", coordinates },
      lastLocationUpdate: new Date(),
    },
  );

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  res.status(200).json({ success: true });
});

/* =================================================== */
/* ADMIN CONTROLLERS */
/* =================================================== */

export const getAllDeliveryPersons = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const deliveryPersons = await DeliveryPerson.find()
    .select(
      "fullname phone vehicleType averageRating totalReviews availability status suspension createdAt profilePicUrl govtIdUrl drivingLicenseUrl vehicleRegistrationUrl",
    )
    .populate("userId", "email role")
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await DeliveryPerson.countDocuments();

  res.status(200).json({
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    results: deliveryPersons.length,
    data: deliveryPersons,
  });
});

/* --------------------------------------------------- */
/* Approve */
/* --------------------------------------------------- */

export const approveDeliveryPerson = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    { status: "active" },
    { new: true },
  );

  if (!deliveryPerson) {
    return next(new AppError("Pending delivery person not found", 404));
  }

  await User.findByIdAndUpdate(deliveryPerson.userId, {
    role: "delivery_man",
  });

  res.status(200).json({
    success: true,
    message: "Delivery person approved successfully",
  });
});

/* --------------------------------------------------- */
/* Reject (Deletes uploaded documents) */
/* --------------------------------------------------- */

export const rejectDeliveryPerson = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    { status: "rejected" },
    { new: true },
  );

  if (!deliveryPerson) {
    return next(new AppError("Pending delivery person not found", 404));
  }

  /* Delete uploaded documents */
  await deleteFileIfExists(deliveryPerson.govtIdUrl);
  await deleteFileIfExists(deliveryPerson.drivingLicenseUrl);
  await deleteFileIfExists(deliveryPerson.vehicleRegistrationUrl);
  await deleteFileIfExists(deliveryPerson.profilePicUrl);

  await User.findByIdAndUpdate(deliveryPerson.userId, {
    role: "customer",
  });

  res.status(200).json({
    success: true,
    message: "Delivery person rejected successfully",
  });
});

/* --------------------------------------------------- */
/* Suspend */
/* --------------------------------------------------- */

export const suspendDeliveryPerson = catchAsync(async (req, res, next) => {
  const { from, to, reason } = req.body;

  if (!from || !to || !reason) {
    return next(
      new AppError("Please provide from, to and reason for suspension.", 400),
    );
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (fromDate >= toDate) {
    return next(
      new AppError("Suspension end date must be after start date", 400),
    );
  }

  const deliveryPerson = await DeliveryPerson.findOneAndUpdate(
    { _id: req.params.id, status: "active" },
    {
      status: "suspended",
      suspension: {
        from: fromDate,
        to: toDate,
        reason,
      },
    },
    { new: true },
  );

  if (!deliveryPerson) {
    return next(new AppError("Active delivery person not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Delivery person suspended successfully",
  });
});
