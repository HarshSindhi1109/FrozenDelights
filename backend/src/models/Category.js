import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxLength: 100,
      trim: true,
    },

    nameNormalized: {
      type: String,
      unique: true,
    },

    description: {
      type: String,
      required: true,
      maxLength: 500,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

CategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.nameNormalized = this.name.trim().toLowerCase();
  }

  next();
});

// CategorySchema.pre("findOneAndUpdate", function (next) {
//   const update = this.getUpdate();
//   if (update.name) {
//     update.nameNormalized = update.name.trim().toLowerCase();
//   }

//   next();
// });

const Category = mongoose.model("Category", CategorySchema);

export default Category;
