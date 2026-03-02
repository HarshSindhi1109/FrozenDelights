import razorpay, { verifyRazorpaySignature } from "../config/razorpay.js";
import Order from "../models/Order.js";
import IceCream from "../models/IceCream.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

export const createRazorPayOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return next(new AppError("Order not found.", 404));
  }

  if (order.paymentMethod !== "razorpay") {
    return next(new AppError("Invalid payment method for Razorpay.", 400));
  }

  if (order.paymentStatus === "paid") {
    return next(new AppError("Order already paid.", 400));
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: order.totalAmount * 100,
    currency: "INR",
    receipt: order._id.toString(),
  });

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(200).json({
    success: true,
    data: razorpayOrder,
  });
});

export const verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

  if (!order) {
    return next(new AppError("Order not found.", 404));
  }

  verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  order.paymentStatus = "paid";
  order.status = "confirmed";
  order.razorpayPaymentId = razorpay_payment_id;
  order.paidAt = Date.now();

  await Order.save();

  for (const item of order.items) {
    const iceCream = await IceCream.findById(item.iceCreamId);
    const variant = iceCream.variants.find((v) => v.size === item.size);

    variant.stock -= item.quantity;
    await iceCream.save();
  }

  res.status(200).json({
    success: true,
    message: "Payment verified successfully.",
  });
});
