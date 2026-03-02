import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "new_order",
        "payout_processed",
        "account_suspended",
        "order_cancelled",
      ],
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },

    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: function () {
        return ["new_order", "order_cancelled"].includes(this.type);
      },
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ deliveryPersonId: 1, isRead: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
