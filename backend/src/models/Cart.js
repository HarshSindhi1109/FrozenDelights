import mongoose from "mongoose";

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        iceCreamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "IceCream",
          required: true,
        },

        size: {
          type: String,
          required: true,
          trim: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        }
      },
    ],
  },
  { timestamps: true },
);

CartSchema.index({ userId: 1 }, { unique: true });

const Cart = mongoose.model("Cart", CartSchema);

export default Cart;
