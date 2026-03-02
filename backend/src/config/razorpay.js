import Razorpay from "razorpay";
import crypto from "crypto";
import AppError from "../utils/AppError.js";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
  throw new Error("Razorpay environment variables are missing.");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (generatedSignature !== signature) {
    throw new AppError("Invalid Razorpay signature.", 400);
  }

  return true;
};

export default razorpay;
