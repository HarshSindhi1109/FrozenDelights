import mongoose from "mongoose";
import { customAlphabet } from "nanoid";

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
      default: null, // as user might cancel if status is pending/confirmed, also it takes time to allocate delivery person
    },

    orderNumber: {
      type: String,
      unique: true,
    },

    items: [
      {
        iceCreamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "IceCream",
          required: true,
        },

        name: {
          type: String,
          required: true,
        },

        size: {
          type: String,
          required: true,
          trim: true,
        },

        priceAtPurchase: {
          type: Number,
          required: true,
          min: 0,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending", // Order created
        "paid", // razorpay success
        "failed", // razorpay failed
        "cod_pending", // COD but not delivered yet
        "cod_paid", // COD collected
      ],
      default: "pending",
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date,

    transactionId: {
      type: String,
    },

    deliveryAddress: {
      fullname: {
        type: String,
        required: true,
      },

      phone: {
        type: String,
        required: true,
      },

      addressLine: {
        type: String,
        required: true,
      },

      city: {
        type: String,
        required: true,
      },

      pincode: {
        type: String,
        required: true,
      },
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "delivery_requested",
        "delivery_assigned",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    cancelledByRole: {
      type: String,
      enum: ["customer", "admin", "system"],
    },

    cancellationReason: {
      type: String,
    },

    dispatchAttempts: {
      type: Number,
      default: 0,
    },

    notifiedDeliveryPersons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryPerson",
      },
    ],

    rejectedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryPerson",
      },
    ],

    dispatchStatus: {
      type: String,
      enum: ["waiting", "assigned", "failed"],
      default: "waiting",
    },
  },
  { timestamps: true },
);

OrderSchema.pre("save", function (next) {
  for (const item of this.items) {
    if (item.subtotal !== item.priceAtPurchase * item.quantity) {
      return next(new Error("Invalid subtotal calculation"));
    }
  }

  const calculatedTotal = this.items.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  if (this.totalAmount !== calculatedTotal) {
    return next(new Error("Total amount mismatch"));
  }

  if (!this.orderNumber) {
    const genereatedId = customAlphabet(
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      8,
    );

    this.orderNumber = "ORD-" + genereatedId();
  }

  next();
});

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ deliveryPersonId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1, dispatchStatus: 1 });

const Order = mongoose.model("Order", OrderSchema);

export default Order;
