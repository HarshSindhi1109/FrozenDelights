import mongoose from "mongoose";

const IceCreamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    flavourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flavour",
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    variants: [
      {
        size: {
          type: String,
          required: true,
          trim: true,
        },
        basePrice: {
          type: Number,
          required: true,
          min: 0,
        },
        costPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        stock: {
          type: Number,
          default: 0,
          min: 0,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

IceCreamSchema.index({ name: 1, flavourId: 1 }, { unique: true });

IceCreamSchema.pre("save", function (next) {
  const sizes = this.variants.map((v) => v.size);
  const uniqueSizes = new Set(sizes);

  if (sizes.length !== uniqueSizes.size) {
    return next(new Error("Duplicate variant sizes not allowed"));
  }

  next();
});

const IceCream = mongoose.model("IceCream", IceCreamSchema);

export default IceCream;
