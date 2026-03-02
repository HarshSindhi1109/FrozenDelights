import mongoose from "mongoose";

const FlavourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    isSeasonal: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    availableFrom: {
      type: Date,
      required: function () {
        return this.isSeasonal;
      },
    },

    availableTo: {
      type: Date,
      required: function () {
        return this.isSeasonal;
      },
    },
  },
  { timestamps: true },
);

FlavourSchema.pre("validate", function (next) {
  if (
    this.availableFrom &&
    this.availableTo &&
    this.availableFrom > this.availableTo
  ) {
    return next(new Error("Invalid seasonal date range"));
  }

  next();
});

FlavourSchema.index({ name: 1, categoryId: 1 }, { unique: true });

FlavourSchema.index({ categoryId: 1 });

const Flavour = mongoose.model("Flavour", FlavourSchema);

export default Flavour;
