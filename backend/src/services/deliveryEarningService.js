import DeliveryEarning from "../models/DeliveryEarning.js";

export const createEarningForDeliveredOrder = async (order) => {
  if (!order.deliveryPersonId) return;

  // Idempotency guard — never create duplicate earnings for the same order
  const existing = await DeliveryEarning.findOne({ orderId: order._id });
  if (existing) return;

  // Read the fee breakdown that was FROZEN onto the order at creation time.
  // This guarantees the delivery person earns exactly what the customer paid —
  // no recalculation, no drift if admin changes rates between order and delivery.
  const breakdown = order.deliveryFeeBreakdown || {};

  const basePay = breakdown.basePay ?? 0;
  const distancePay = breakdown.distancePay ?? 0;
  const surgeBonus = breakdown.surgeBonus ?? 0;
  const tipAmount = order.tip ?? 0;

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
