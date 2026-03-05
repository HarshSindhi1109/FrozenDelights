import Notification from "../models/Notification.js";
import { getIo, getDeliverySocket } from "../sockets/socketServer.js";
import { findNearestDeliveryPersons } from "./deliveryAssignmentService.js";

export const dispatchOrderToDelivery = async (order, pickupLocation) => {
  const deliveryPersons = await findNearestDeliveryPersons(pickupLocation);

  const io = getIo();

  for (const delivery of deliveryPersons) {
    const socketId = getDeliverySocket(delivery._id.toString());

    const notification = await Notification.create({
      recipientId: delivery._id,
      recipientType: "DeliveryPerson",
      type: "new_order",
      title: "New Order Request",
      message: `Order ${order.orderNumber} available`,
      relatedOrderId: order._id,
    });

    if (socketId) {
      io.to(socketId).emit("newOrderRequest", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
      });
    }
  }
};
