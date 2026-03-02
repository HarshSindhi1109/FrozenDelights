import DeliveryRating from "../models/DeliveryRating.js";
import Order from "../models/Order.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

// Create Delivery Rating (Customer)
export const createDeliveryRating = catchAsync(async (req, res, next) => {
  const { orderId, deliveryPersonId, rating, description } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.userId.toString() !== req.user.id) {
    return next(new AppError("You are not authorized to rate this order", 403));
  }

  if (order.status !== "Delivered") {
    return next(
      new AppError("You can rate delivery only after order is delivered", 400),
    );
  }

  if (order.deliveryPersonId.toString() !== deliveryPersonId) {
    return next(new AppError("Invalid delivery person for this order", 400));
  }

  const existingRating = await DeliveryRating.findOne({
    userId: req.user.id,
    orderId,
    deliveryPersonId,
  });

  if (existingRating) {
    return next(new AppError("You already rated this delivery", 400));
  }

  const deliveryRating = await DeliveryRating.create({
    userId: req.user.id,
    orderId,
    deliveryPersonId,
    rating,
    description,
  });

  res.status(201).json({
    success: true,
    data: deliveryRating,
  });
});

// Get Delivery persons' ratings
export const getDeliveryRatings = catchAsync(async (req, res) => {
  const ratings = await DeliveryRating.find({
    deliveryPersonId: req.params.deliveryPersonId,
  })
    .populate("userId", "username profilePicUrl")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: ratings.length,
    data: ratings,
  });
});

// Update rating
export const updateDeliveryRating = catchAsync(async (req, res, next) => {
  const ratingDoc = await DeliveryRating.findById(req.params.id);

  if (!ratingDoc) {
    return next(new AppError("Rating not found", 404));
  }

  if (ratingDoc.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403));
  }

  if (req.body.rating !== undefined) {
    ratingDoc.rating = req.body.rating;
  }

  if (req.body.description !== undefined) {
    ratingDoc.description = req.body.description;
  }

  await ratingDoc.save();

  res.status(200).json({
    success: true,
    data: ratingDoc,
  });
});

// Delete rating
export const deleteDeliveryRating = catchAsync(async (req, res, next) => {
  const ratingDoc = await DeliveryRating.findById(req.params.id);

  if (!ratingDoc) {
    return next(new AppError("Rating not found", 404));
  }

  if (ratingDoc.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403));
  }

  await DeliveryRating.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Delivery rating deleted successfully",
  });
});
