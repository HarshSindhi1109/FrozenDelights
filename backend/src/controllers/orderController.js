import mongoose from "mongoose";
import Order from "../models/Order.js";
import IceCream from "../models/IceCream.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { createEarningForDeliveredOrder } from "../services/deliveryEarningService.js";

// Create Order (Customer)
export const createOrder = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { items, paymentMethod, deliveryAddress } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError("Order items are required.", 400));
  }

  if (!["razorpay", "cod"].includes(paymentMethod)) {
    return next(new AppError("Invalid payment method.", 400));
  }

  if (!deliveryAddress) {
    return next(new AppError("Delivery address is required.", 400));
  }

  let orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const { iceCreamId, size, quantity } = item;

    if (
      !mongoose.Types.ObjectId.isValid(iceCreamId) ||
      !size ||
      !quantity ||
      quantity < 1
    ) {
      return next(new AppError("Invalid order item data.", 400));
    }

    const iceCream = await IceCream.findById(iceCreamId);

    if (!iceCream || !iceCream.isActive) {
      return next(new AppError("Ice-cream not available.", 400));
    }

    const variant = iceCream.variants.find(
      (v) => v.size === size && v.isAvailable,
    );

    if (!variant) {
      return next(new AppError("Selected variant not available.", 400));
    }

    if (variant.stock < quantity) {
      return next(new AppError("Insufficient stock.", 400));
    }

    const subtotal = variant.basePrice * quantity;

    orderItems.push({
      iceCreamId,
      name: iceCream.name,
      size,
      priceAtPurchase: variant.basePrice,
      quantity,
      subtotal,
    });

    totalAmount += subtotal;
  }

  let paymentStatus = "pending";
  let orderStatus = "pending";

  if (paymentMethod === "cod") {
    paymentStatus = "cod_pending";
    orderStatus = "confirmed";
  }

  const order = await Order.create({
    userId,
    items: orderItems,
    totalAmount,
    paymentMethod,
    paymentStatus,
    status: orderStatus,
    deliveryAddress,
  });

  if (paymentMethod === "cod") {
    for (const item of orderItems) {
      const iceCream = await IceCream.findById(item.iceCreamId);
      const variant = iceCream.variants.find((v) => v.size === item.size);

      await IceCream.updateOne(
        {
          _id: item.iceCreamId,
          "variants.size": item.size,
          "variants.stock": { $gte: item.quantity },
        },
        { $inc: { "variants.$.stock": -item.quantity } },
      );
    }
  }

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    data: order,
  });
});

// Get All Orders (Admin)
export const getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, paymentStatus, search } = req.query;

  const pageNumber = Math.max(parseInt(page) || 1, 1);
  const pageSize = Math.min(parseInt(limit) || 20, 100);
  const skip = (pageNumber - 1) * pageSize;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (search) {
    filter.orderNumber = { $regex: search.trim(), $options: "i" };
  }

  const orders = await Order.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(pageSize)
    .populate("userId", "name email")
    .populate("items.iceCreamId", "imageUrl");

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    total,
    results: orders.length,
    data: orders,
  });
});

// Get My Orders (Customer Order History)
export const getMyOrders = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const { page = 1, limit = 10, status } = req.query;

  const pageNumber = Math.max(parseInt(page) || 1, 1);
  const pageSize = Math.min(parseInt(limit) || 10, 50);
  const skip = (pageNumber - 1) * pageSize;

  const filter = { userId };

  if (status) {
    filter.status = status;
  }

  const orders = await Order.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(pageSize)
    .populate("items.iceCreamId", "imageUrl");

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    success: true,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    total,
    results: orders.length,
    data: orders,
  });
});

// Get Order By Id (Customer)
export const getOrderById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate("userId", "name email")
    .populate("items.iceCreamId", "imageUrl");

  if (!order) {
    return next(new AppError("Order not found.", 404));
  }

  if (
    order.userId._id.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("Not authorized.", 403));
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// Cancel Order (Customer)
export const cancelOrder = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    return next(new AppError("Order not found.", 404));
  }

  if (order.userId.toString() !== req.user.id) {
    return next(new AppError("Not authorized.", 403));
  }

  if (!["pending", "confirmed"].includes(order.status)) {
    return next(new AppError("Order cannot be cancelled at this stage.", 400));
  }

  const shouldRestoreStock =
    order.paymentMethod === "cod" || order.paymentStatus === "paid";

  if (shouldRestoreStock) {
    for (const item of order.items) {
      const iceCream = await IceCream.findById(item.iceCreamId);
      const variant = iceCream.variants.find((v) => v.size === item.size);

      if (variant) {
        variant.stock += item.quantity;
        await iceCream.save();
      }
    }
  }

  order.status = "cancelled";
  order.cancelledByRole = "customer";
  order.cancellationReason = reason || "Cancelled by customer";

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully.",
  });
});

// Update order status (Admin)
export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  order.status = status;
  await order.save();

  // 🔥 AUTO TRIGGER
  if (order.status !== "delivered" && status === "delivered") {
    await createEarningForDeliveredOrder(order);
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});
