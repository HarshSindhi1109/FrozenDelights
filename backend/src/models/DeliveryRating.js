import mongoose from "mongoose";

const DeliveryRatingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 0.5,
      max: 5,
      validate: {
        validator: function (value) {
          return value * 2 === Math.round(value * 2);
        },
        message: "Rating must be in increment of 0.5",
      },
    },

    description: {
      type: String,
      maxLength: 500,
    },
  },
  { timestamps: true },
);

DeliveryRatingSchema.index(
  { userId: 1, deliveryPersonId: 1, orderId: 1 },
  { unique: true },
);
DeliveryRatingSchema.index({ deliveryPersonId: 1, createdAt: -1 });

const DeliveryRating = mongoose.model("DeliveryRating", DeliveryRatingSchema);

export default DeliveryRating;
