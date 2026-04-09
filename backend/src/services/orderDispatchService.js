import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import { findNearestDeliveryPersons } from "./deliveryAssignmentService.js";

export const dispatchOrderToDelivery = async (order, pickupLocation) => {
  console.log("📦 dispatchOrderToDelivery called for", order.orderNumber);

  const excludedDrivers = [
    ...(order.notifiedDeliveryPersons || []),
    ...(order.rejectedBy || []),
  ];

  const deliveryPersons = await findNearestDeliveryPersons(
    pickupLocation,
    excludedDrivers,
  );

  console.log("👥 Found delivery persons:", deliveryPersons.length);

  if (deliveryPersons.length === 0) {
    order.dispatchAttempts += 1;

    if (order.dispatchAttempts >= 5) {
      order.dispatchStatus = "failed";
      await order.save();
      return;
    }

    await order.save();

    setTimeout(() => {
      retryDispatchIfNeeded(order._id, pickupLocation, order.dispatchAttempts);
    }, 20000);

    return;
  }

  order.dispatchStatus = "waiting";

  for (const delivery of deliveryPersons) {
    const alreadyNotified = order.notifiedDeliveryPersons.some((id) =>
      id.equals(delivery._id),
    );

    if (!alreadyNotified) {
      order.notifiedDeliveryPersons.push(delivery._id);
    }

    // Create notification — this is what the polling endpoint reads
    await Notification.create({
      recipientId: delivery._id,
      recipientType: "DeliveryPerson",
      type: "new_order",
      title: "New Order Request",
      message: `Order ${order.orderNumber} available`,
      relatedOrderId: order._id,
    });
  }

  order.dispatchAttempts += 1;
  await order.save();

  // Retry fallback — in case no rider accepts within 20 seconds
  const attemptNumber = order.dispatchAttempts;

  setTimeout(() => {
    retryDispatchIfNeeded(order._id, pickupLocation, attemptNumber);
  }, 20000);
};

export const retryDispatchIfNeeded = async (
  orderId,
  pickupLocation,
  attemptNumber,
) => {
  const order = await Order.findById(orderId);

  if (!order) return;
  if (order.deliveryPersonId) return;
  if (order.status !== "delivery_requested") return;
  if (order.dispatchAttempts !== attemptNumber) return;

  if (order.dispatchAttempts >= 5) {
    order.dispatchStatus = "failed";
    await order.save();
    return;
  }

  await dispatchOrderToDelivery(order, pickupLocation);
};
