import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    // Who will receive the notification
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientType",
    },

    recipientType: {
      type: String,
      required: true,
      enum: ["DeliveryPerson", "User", "Admin"],
      default: "DeliveryPerson",
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
      trim: true,
      maxLength: 100,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxLength: 300,
    },

    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: function () {
        return ["new_order", "order_cancelled"].includes(this.type);
      },
    },

    // Realtime delivery status
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: Date,

    // Flexible extra info
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

/*
Indexes
*/

// unread notifications
NotificationSchema.index({ recipientId: 1, isRead: 1 });

// order specific notifications
NotificationSchema.index({ relatedOrderId: 1 });

// recent notifications
NotificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
