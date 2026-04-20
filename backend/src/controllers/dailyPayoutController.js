import DeliveryPerson from "../models/DeliveryPerson.js";
import DailyPayout from "../models/DailyPayout.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { processDailyPayout } from "../services/dailyPayoutService.js";
import {
  createFundAccountIdIfNotExists,
  rzpX,
} from "../services/razorpayPayoutService.js";
import { v4 as uuidv4 } from "uuid";

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

  // FIX: guard both terminal / in-flight statuses from manual override
  if (payout.payoutStatus === "paid") {
    return next(new AppError("Payout already marked as paid", 400));
  }
  if (payout.payoutStatus === "processing") {
    return next(
      new AppError(
        "Payout is currently processing via Razorpay. Wait for the webhook to update its status.",
        400,
      ),
    );
  }

  const allowedStatuses = ["pending", "processing", "paid", "failed"];
  if (!allowedStatuses.includes(payoutStatus)) {
    return next(new AppError("Invalid payout status", 400));
  }

  // If marking paid manually, require paymentProvider
  if (payoutStatus === "paid" && !payout.paymentProvider && !paymentProvider) {
    return next(
      new AppError("Payment provider is required when marking as paid", 400),
    );
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
  const deliveryPerson = await DeliveryPerson.findOne({ userId: req.user.id });

  if (!deliveryPerson) {
    return next(new AppError("Delivery person not found", 404));
  }

  const payouts = await DailyPayout.find({
    deliveryPersonId: deliveryPerson._id,
  }).sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts,
  });
});

export const getAllPayouts = catchAsync(async (req, res, next) => {
  // FIX: populate deliveryPersonId so the frontend gets fullname & phone
  const payouts = await DailyPayout.find()
    .populate("deliveryPersonId", "fullname phone")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: payouts,
  });
});

export const processPayout = catchAsync(async (req, res, next) => {
  const { payoutId } = req.params;

  // FIX: allow retrying failed payouts — accept both "pending" and "failed"
  const payout = await DailyPayout.findOne({
    _id: payoutId,
    payoutStatus: { $in: ["pending", "failed"] },
  });

  if (!payout) {
    return next(
      new AppError(
        "Payout not found, or it is already processing / paid.",
        400,
      ),
    );
  }

  const deliveryPerson = await DeliveryPerson.findById(
    payout.deliveryPersonId,
  ).populate("userId", "email");

  if (!deliveryPerson || deliveryPerson.status !== "active") {
    return next(new AppError("Delivery person is not active", 400));
  }

  // FIX: only mark "processing" AFTER Razorpay accepts the request,
  // so a pre-call crash doesn't leave the record stuck in "processing".
  try {
    const fundAccountId = await createFundAccountIdIfNotExists(deliveryPerson);

    const { data: razorpayResponse } = await rzpX.post(
      "/payouts",
      {
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: Math.round(payout.totalEarnings * 100),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: payout._id.toString(),
        narration: "Daily Delivery Payout",
      },
      {
        headers: {
          "X-Payout-Idempotency": uuidv4(),
        },
      },
    );

    payout.payoutStatus = "processing";
    payout.paymentProvider = "razorpay";
    payout.transactionReference = razorpayResponse.id;
    payout.razorpayPayoutId = razorpayResponse.id;
    payout.failureReason = undefined; // clear any previous failure reason
    await payout.save();

    res.status(200).json({
      success: true,
      message: "Payout initiated successfully",
    });
  } catch (err) {
    payout.payoutStatus = "failed";
    payout.failureReason =
      err.response?.data?.error?.description || err.message;
    await payout.save();
    throw err;
  }
});
