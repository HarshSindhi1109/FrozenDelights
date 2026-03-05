import DeliveryPerson from "../models/DeliveryPerson.js";
import DailyPayout from "../models/DailyPayout.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { processDailyPayout } from "../services/dailyPayoutService.js";
import { createFundAccountIdIfNotExists } from "../services/razorpayPayoutService.js";
import razorpay from "../config/razorpay.js";

export const createDailyPayout = catchAsync(async (req, res, next) => {
  const { deliveryPersonId, date } = req.body;

  if (!deliveryPersonId || !date) {
    return next(new AppError("Delivery person ID and date are required", 400));
  }

  const deliveryPerson = await DeliveryPerson.findById(deliveryPersonId);
  if (!deliveryPerson) {
    return next(new AppError("Delivery person not found", 404));
  }

  const result = await processDailyPayout(new Date(date), deliveryPersonId);

  res.status(200).json({
    success: true,
    message: result.message,
    payoutsCreated: result.payoutsCreated,
  });
});

export const updatePayoutStatus = catchAsync(async (req, res, next) => {
  const { payoutId } = req.params;
  const { payoutStatus, paymentProvider, transactionReference } = req.body;

  const payout = await DailyPayout.findById(payoutId);
  if (!payout) {
    return next(new AppError("Payout not found", 404));
  }

  if (payout.payoutStatus === "paid") {
    return next(new AppError("Payout already marked as paid", 400));
  }

  const allowedStatuses = ["pending", "processing", "paid", "failed"];
  if (!allowedStatuses.includes(payoutStatus)) {
    return next(new AppError("Invalid payout status", 400));
  }

  payout.payoutStatus = payoutStatus;

  if (paymentProvider) payout.paymentProvider = paymentProvider;
  if (transactionReference) payout.transactionReference = transactionReference;

  await payout.save();

  res.status(200).json({
    success: true,
    data: payout,
  });
});

export const getMyPayouts = catchAsync(async (req, res, next) => {
  const payouts = await DailyPayout.find({
    deliveryPersonId: req.user.id,
  }).sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts,
  });
});

export const getAllPayouts = catchAsync(async (req, res, next) => {
  const payouts = await DailyPayout.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts,
  });
});

export const processPayout = catchAsync(async (req, res, next) => {
  const { payoutId } = req.params;

  const payout = await DailyPayout.findOne({
    _id: payoutId,
    payoutStatus: "pending",
  });

  if (!payout) {
    return next(new AppError("Payout already processed or not found", 400));
  }

  const deliveryPerson = await DeliveryPerson.findById(
    payout.deliveryPersonId,
  ).populate("userId", "email");

  if (!deliveryPerson || deliveryPerson.status !== "active") {
    return next(new AppError("Delivery person is not active", 400));
  }

  payout.payoutStatus = 'processing';
  await payout.save();

  const fundAccountId = await createFundAccountIdIfNotExists(deliveryPerson);

  try {
    const razorpayResponse = await razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: Math.round(payout.totalEarnings * 100),
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      reference_id: payout._id.toString(),
      narration: "Daily Delivery Payout",
    });

    payout.paymentProvider = "razorpay";
    payout.transactionReference = razorpayResponse.id;
    payout.razorpayPayoutId = razorpayResponse.id;

    await payout.save();

    res.status(200).json({
      success: true,
      message: "Payout initiated successfully",
    });
  } catch (err) {
    payout.payoutStatus = "failed";
    await payout.save();
    throw err;
  }
});
