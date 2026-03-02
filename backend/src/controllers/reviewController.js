import Review from "../models/Review.js";
import IceCream from "../models/IceCream.js";
import Order from "../models/Order.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

// Create Review (Customer)
export const createReview = catchAsync(async (req, res, next) => {
  const { iceCreamId, orderId, rating, description } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized to review this order", 403));
  }

  if (order.status !== "delivered") {
    return next(new AppError("You can review only after delivery", 400));
  }

  const iceCream = await IceCream.findById(iceCreamId);
  if (!iceCream) {
    return next(new AppError("Ice-cream not found", 404));
  }

  const review = await Review.create({
    userId: req.user.id,
    iceCreamId,
    orderId,
    rating,
    description,
  });

  res.status(201).json({
    success: true,
    data: review,
  });
});

// Get reviews for ice-cream (Public)
export const getIceCreamReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({
    iceCreamId: req.params.iceCreamId,
  })
    .populate("userId", "name profilePicUrl")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
});

// Update Review (Customer)
export const updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  if (review.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403));
  }

  review.rating = req.body.rating || review.rating;
  review.description = req.body.description || review.description;

  await review.save();

  res.status(200).json({
    success: true,
    data: review,
  });
});

// Delete Review (Customer)
export const deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  if (review.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized", 403));
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});
