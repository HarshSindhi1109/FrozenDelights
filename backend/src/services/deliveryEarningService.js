import DeliveryEarning from "../models/DeliveryEarning.js";

export const createEarningForDeliveredOrder = async (order) => {
  if (!order.deliveryPersonId) return;

  const existing = await DeliveryEarning.findOne({
    orderId: order._id,
  });

  if (existing) return;

  // For now, static data
  const basePay = 40; // example logic
  const distancePay = order.distance * 5;
  const surgeBonus = order.isSurge ? 20 : 0;
  const tipAmount = order.tipAmount || 0;

  const totalEarning = basePay + distancePay + surgeBonus + tipAmount;

  await DeliveryEarning.create({
    deliveryPersonId: order.deliveryPersonId,
    orderId: order._id,
    basePay,
    distancePay,
    surgeBonus,
    tipAmount,
    totalEarning,
  });
};
