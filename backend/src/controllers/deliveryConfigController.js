import DeliveryConfig from "../models/DeliveryConfig.js";
import {
  getConfig,
  calculateDeliveryFee,
} from "../services/deliveryFeeService.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

// GET /api/v1/delivery-config
// Admin + public (checkout page needs to display the fee preview)
export const getDeliveryConfig = catchAsync(async (req, res) => {
  const config = await getConfig();
  res.status(200).json({ success: true, data: config });
});

// PATCH /api/v1/delivery-config
// Admin only — update any subset of config fields
export const updateDeliveryConfig = catchAsync(async (req, res, next) => {
  const allowed = [
    "basePay",
    "perKmRate",
    "surgeEnabled",
    "surgeMultiplier",
    "shopLat",
    "shopLng",
    "minDeliveryFee",
    "maxDeliveryFee",
  ];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return next(new AppError("No valid fields provided.", 400));
  }

  // surgeMultiplier must be >= 1
  if (updates.surgeMultiplier !== undefined && updates.surgeMultiplier < 1) {
    return next(new AppError("Surge multiplier must be at least 1.", 400));
  }

  let config = await DeliveryConfig.findOne();

  if (!config) {
    config = await DeliveryConfig.create(updates);
  } else {
    Object.assign(config, updates);
    await config.save();
  }

  res.status(200).json({
    success: true,
    message: "Delivery config updated.",
    data: config,
  });
});

// POST /api/v1/delivery-config/preview
// Returns a fee breakdown for a given coordinate — used by checkout
// to show the customer the exact fee before placing the order.
// Does NOT require admin — any authenticated user can call it.
export const previewDeliveryFee = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return next(new AppError("lat and lng are required.", 400));
  }

  const customerLat = parseFloat(lat);
  const customerLng = parseFloat(lng);

  if (isNaN(customerLat) || isNaN(customerLng)) {
    return next(new AppError("lat and lng must be valid numbers.", 400));
  }

  const breakdown = await calculateDeliveryFee({
    customerLat,
    customerLng,
  });

  res.status(200).json({
    success: true,
    data: breakdown,
  });
});
