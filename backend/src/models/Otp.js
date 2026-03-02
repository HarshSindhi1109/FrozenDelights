import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hashedOtp: {
      type: String,
      required: true,
    },

    otpExpires: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index, expires at otpExpires
    },

    cooldownUntil: {
      type: Date,
    },

    purpose: {
      type: String,
      enum: ["email_verification", "password_reset", "admin_login"],
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Otp = mongoose.model("Otp", OtpSchema);

export default Otp;
