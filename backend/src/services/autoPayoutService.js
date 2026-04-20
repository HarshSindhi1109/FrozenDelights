import DeliveryPerson from "../models/DeliveryPerson.js";
import {
  createFundAccountIdIfNotExists,
  rzpX,
} from "./razorpayPayoutService.js";
import { v4 as uuidv4 } from "uuid";

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
        headers: { "X-Payout-Idempotency": uuidv4() },
      },
    );
    payout.payoutStatus = "processing";
    payout.paymentProvider = "razorpay";
    payout.transactionReference = razorpayResponse.id;
    payout.razorpayPayoutId = razorpayResponse.id;
    await payout.save();
  } catch (error) {
    payout.payoutStatus = "failed";
    payout.failureReason =
      error.response?.data?.error?.description || error.message;
    await payout.save();
  }
};
