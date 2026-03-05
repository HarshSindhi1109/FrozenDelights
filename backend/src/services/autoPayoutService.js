import razorpay from "../config/razorpay.js";
import DeliveryPerson from "../models/DeliveryPerson.js";
import { createFundAccountIdIfNotExists } from "./razorpayPayoutService.js";

export const processRazorpayPayout = async (payout) => {
  if (payout.payoutStatus !== "pending") return;

  const deliveryPerson = await DeliveryPerson.findById(
    payout.deliveryPersonId,
  ).populate("userId", "email");

  if (!deliveryPerson || deliveryPerson.status !== "active") {
    payout.payoutStatus = "failed";
    payout.failureReason = "Delivery person inactive";
    await payout.save();
    return;
  }

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

    payout.payoutStatus = "processing";
    payout.paymentProvider = "razorpay";
    payout.transactionReference = razorpayResponse.id;
    payout.razorpayPayoutId = razorpayResponse.id;

    await payout.save();
  } catch (error) {
    payout.payoutStatus = "failed";
    payout.failureReason = error.message;
    await payout.save();
  }
};
