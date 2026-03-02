import mongoose from "mongoose";

const DeliveryEarningSchema = new mongoose.Schema(
  {
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyPayout",
      default: null,
    },

    basePay: {
      type: Number,
      min: 0,
    },

    distancePay: {
      type: Number,
      min: 0,
    },

    surgeBonus: {
      type: Number,
      min: 0,
    },

    tipAmount: {
      type: Number,
      min: 0,
    },

    totalEarning: {
      type: Number,
      required: true,
      min: 0,
    },

    earningDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    isSettled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

DeliveryEarningSchema.pre("save", function (next) {
  const calculatedTotal =
    (this.basePay || 0) +
    (this.distancePay || 0) +
    (this.surgeBonus || 0) +
    (this.tipAmount || 0);

  if (this.totalEarning !== calculatedTotal) {
    return next(new Error("Total earning mismatch!!!"));
  }

  next();
});

DeliveryEarningSchema.index(
  { deliveryPersonId: 1, orderId: 1 },
  { unique: true },
);
DeliveryEarningSchema.index({ deliveryPersonId: 1, isSettled: 1 });

const DeliveryEarning = mongoose.model(
  "DeliveryEarning",
  DeliveryEarningSchema,
);

export default DeliveryEarning;
