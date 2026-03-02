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

DeliveryRatingSchema.statics.calcAverageRatings = async function (
  deliveryPersonId,
) {
  const stats = await this.aggregate([
    {
      $match: { deliveryPersonId: deliveryPersonId },
    },
    {
      $group: {
        _id: "$deliveryPersonId",
        avgRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const DeliveryPerson = mongoose.model("DeliveryPerson");

  if (stats.length > 0) {
    await DeliveryPerson.findByIdAndUpdate(deliveryPersonId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].totalRatings,
    });
  } else {
    await DeliveryPerson.findByIdAndUpdate(deliveryPersonId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

DeliveryRatingSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.deliveryPersonId);
});

DeliveryRatingSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.deliveryPersonId);
  }
});

DeliveryRatingSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.deliveryPersonId);
  }
});

DeliveryRatingSchema.index(
  { userId: 1, deliveryPersonId: 1, orderId: 1 },
  { unique: true },
);
DeliveryRatingSchema.index({ deliveryPersonId: 1, createdAt: -1 });

const DeliveryRating = mongoose.model("DeliveryRating", DeliveryRatingSchema);

export default DeliveryRating;
