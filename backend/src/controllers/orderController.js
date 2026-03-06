import mongoose from "mongoose";
import Order from "../models/Order.js";
import IceCream from "../models/IceCream.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { createEarningForDeliveredOrder } from "../services/deliveryEarningService.js";
import DeliveryPerson from "../models/DeliveryPerson.js";
import { dispatchOrderToDelivery } from "../services/orderDispatchService.js";

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

  const previousStatus = order.status;

  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["delivery_requested"],
    delivery_requested: ["delivery_assigned"],
    delivery_assigned: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  const nextStatuses = allowedTransitions[previousStatus];

  if (!nextStatuses.includes(status)) {
    return next(
      new AppError(
        `Invalid status transition from ${previousStatus} to ${status}`,
        400,
      ),
    );
  }

  order.status = status;
  await order.save();

  // dispatch delivery when ready
  if (
    previousStatus !== "delivery_requested" &&
    status === "delivery_requested"
  ) {
    const pickupLocation = [72.5714, 22.3072];

    await dispatchOrderToDelivery(order, pickupLocation);
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// Accept Delivery (DeliveryPerson)
export const acceptDelivery = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  if (deliveryPerson.status !== "active") {
    return next(new AppError("Delivery account not active", 403));
  }

  if (deliveryPerson.availability !== "online") {
    return next(new AppError("You are not available for delivery", 400));
  }

  const activeOrder = await Order.findOne({
    deliveryPersonId: deliveryPerson._id,
    status: { $in: ["delivery_assigned", "out_for_delivery"] },
  });

  if (activeOrder) {
    return next(new AppError("You already have an active delivery", 400));
  }

  const orderId = req.params.id;

  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: "delivery_requested",
      deliveryPersonId: null, // prevents race condition
    },
    {
      deliveryPersonId: deliveryPerson._id,
      status: "delivery_assigned",
      dispatchStatus: "assigned",
    },
    { new: true },
  );

  if (!order) {
    return next(
      new AppError("Order already accepted by another delivery person", 400),
    );
  }

  // mark delivery person busy
  deliveryPerson.availability = "busy";
  await deliveryPerson.save();

  res.status(200).json({
    success: true,
    message: "Order accepted successfully",
    data: order,
  });
});

// Reject Delivery
export const rejectDelivery = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  const orderId = req.params.id;

  const order = await Order.findById(orderId);

  if (!order || order.status !== "delivery_requested") {
    return next(new AppError("Order not available for rejection", 400));
  }

  const alreadyRejected = order.rejectedBy.some((id) =>
    id.equals(deliveryPerson._id),
  );

  if (alreadyRejected) {
    return next(new AppError("You already rejected this order", 400));
  }

  order.rejectedBy.push(deliveryPerson._id);
  await order.save();

  // dispatch to other drivers
  await dispatchOrderToDelivery(order, [72.5714, 22.3072]);

  res.status(200).json({
    success: true,
    message: "Delivery request rejected",
  });
});

// when delivery person collects the item from shop
export const pickupOrder = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.deliveryPersonId?.toString() !== deliveryPerson._id.toString()) {
    return next(new AppError("You are not assigned to this order", 403));
  }

  if (order.status !== "delivery_assigned") {
    return next(new AppError("Order not ready for pickup", 400));
  }

  order.status = "out_for_delivery";

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order picked up successfully",
    data: order,
  });
});

// After order delivers
export const deliverOrder = catchAsync(async (req, res, next) => {
  const deliveryPerson = await DeliveryPerson.findOne({
    userId: req.user.id,
  });

  if (!deliveryPerson) {
    return next(new AppError("Delivery profile not found", 404));
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.deliveryPersonId?.toString() !== deliveryPerson._id.toString()) {
    return next(new AppError("You are not assigned to this order", 403));
  }

  if (order.status !== "out_for_delivery") {
    return next(new AppError("Order is not out for delivery", 400));
  }

  const previousStatus = order.status;

  order.status = "delivered";
  await order.save();

  // trigger earning
  if (previousStatus !== "delivered") {
    await createEarningForDeliveredOrder(order);
  }

  // make delivery person available again
  deliveryPerson.availability = "online";
  await deliveryPerson.save();

  res.status(200).json({
    success: true,
    message: "Order delivered successfully",
    data: order,
  });
});
