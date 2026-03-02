import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    iceCreamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IceCream",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
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

ReviewSchema.statics.calcAverageRatings = async function (iceCreamId) {
  const stats = await this.aggregate([
    {
      $match: { iceCreamId: iceCreamId },
    },
    {
      $group: {
        _id: "$iceCreamId",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const IceCream = mongoose.model("IceCream");

  if (stats.length > 0) {
    await IceCream.findByIdAndUpdate(iceCreamId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await IceCream.findByIdAndUpdate(iceCreamId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

ReviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.iceCreamId);
});

ReviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.iceCreamId);
  }
});

ReviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.iceCreamId);
  }
});

ReviewSchema.index({ userId: 1, iceCreamId: 1, orderId: 1 }, { unique: true });
ReviewSchema.index({ iceCreamId: 1, createdAt: -1 });

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
