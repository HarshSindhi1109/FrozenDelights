import mongoose from "mongoose";

const DailyPayoutSchema = new mongoose.Schema(
  {
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    totalOrders: {
      type: Number,
      min: 0,
    },

    totalBasePay: {
      type: Number,
      min: 0,
    },

    totalDistancePay: {
      type: Number,
      min: 0,
    },

    totalSurgeBonus: {
      type: Number,
      min: 0,
    },

    totalTips: {
      type: Number,
      min: 0,
    },

    totalEarnings: {
      type: Number,
      required: true,
      min: 0,
    },

    payoutStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
    },

    paymentProvider: {
      type: String,
      enum: ["razorpay", "stripe"],
    },

    transactionReference: {
      type: String,
    },
  },
  { timestamps: true },
);

DailyPayoutSchema.pre("validate", function (next) {
  if (this.date) {
    const normalized = new Date(this.date);
    normalized.setHours(0, 0, 0, 0);
    this.date = normalized;
  }

  next();
});

DailyPayoutSchema.pre("save", function (next) {
  const calculatedTotal =
    (this.totalBasePay || 0) +
    (this.totalDistancePay || 0) +
    (this.totalSurgeBonus || 0) +
    (this.totalTips || 0);

  if (calculatedTotal !== this.totalEarnings) {
    return next(new Error("total earning mismatch!!!"));
  }

  next();
});

DailyPayoutSchema.index({ deliveryPersonId: 1, date: 1 }, { unique: true });
DailyPayoutSchema.index({ payoutStatus: 1 });

const DailyPayout = mongoose.model("DailyPayout", DailyPayoutSchema);

export default DailyPayout;
