import crypto from "crypto";
import DailyPayout from "../models/DailyPayout.js";

export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("Webhook secret not configured");
      return res.status(200).send("OK");
    }

    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      console.error("Missing Razorpay signature header");
      return res.status(200).send("OK");
    }

    // ⚠️ IMPORTANT: use RAW body buffer
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.body) // DO NOT JSON.stringify
      .digest("hex");

    if (generatedSignature !== signature) {
      console.error("Invalid Razorpay webhook signature");
      return res.status(200).send("OK"); // never 400
    }

    // Now safely parse JSON
    const payload = JSON.parse(req.body.toString());

    const event = payload.event;

    // Only handle payout events
    if (!payload.payload?.payout?.entity) {
      return res.status(200).send("OK");
    }

    const payoutData = payload.payload.payout.entity;

    const payout = await DailyPayout.findOne({
      razorpayPayoutId: payoutData.id,
    });

    if (!payout) {
      return res.status(200).send("OK");
    }

    if (event === "payout.processed") {
      payout.payoutStatus = "paid";
      payout.failureReason = undefined;
    }

    if (event === "payout.failed") {
      payout.payoutStatus = "failed";
      payout.failureReason = payoutData.failure_reason || "Unknown error";
    }

    await payout.save();

    return res.status(200).send("OK");
  } catch (error) {
    // Never throw error in webhook
    console.error("Webhook processing error:", error);
    return res.status(200).send("OK");
  }
};
