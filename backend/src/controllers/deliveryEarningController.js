import DeliveryEarning from "../models/DeliveryEarning.js";
import catchAsync from "../utils/catchAsync.js";
import DeliveryPerson from "../models/DeliveryPerson.js";
import AppError from "../utils/AppError.js";

// Get earning of logged-in delivery person
export const getMyEarnings = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson || deliveryPerson.status !== 'active') {
    return next(new AppError("Delivery Person not found or status not active", 404));
  }

  const earnings = await DeliveryEarning.find({
    deliveryPersonId: deliveryPerson._id,
  }).sort({ earningDate: -1 });

  res.status(200).json({
    success: true,
    count: earnings.length,
    data: earnings,
  });
});

// Get unsettled earnings
export const getUnsettledEarnings = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson || deliveryPerson.status !== 'active') {
    return next(new AppError("Delivery Person not found or status not active", 404));
  }

  const earnings = await DeliveryEarning.find({
    deliveryPersonId: deliveryPerson._id,
    isSettled: false,
  });

  const totalUnsettled = earnings.reduce(
    (acc, item) => acc + item.totalEarning,
    0,
  );

  res.status(200).json({
    success: true,
    totalUnsettled,
    data: earnings,
  });
});

// Admin: Get all earnings
export const getAllEarnings = catchAsync(async (req, res, next) => {
  const earnings = await DeliveryEarning.find()
    .populate("deliveryPersonId", "fullname phone profilePicUrl")
    .populate("orderId", "totalAmount status")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: earnings.length,
    data: earnings,
  });
});
