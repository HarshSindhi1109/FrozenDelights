import DeliveryEarning from "../models/DeliveryEarning.js";

export const createEarningForDeliveredOrder = async (order) => {
  if (!order.deliveryPersonId) return;

  const existing = await DeliveryEarning.findOne({ orderId: order._id });
  if (existing) return;

  const breakdown = order.deliveryFeeBreakdown || {};

  const rawBasePay = breakdown.basePay ?? 0;
  const rawDistancePay = breakdown.distancePay ?? 0;
  const rawSurgeBonus = breakdown.surgeBonus ?? 0;
  const tipAmount = order.tip ?? 0;

  const rawDriverPay = rawBasePay + rawDistancePay + rawSurgeBonus;

  // Use deliveryFee (what customer was charged — always capped) as the
  // driver's total pay. Fall back to rawDriverPay capped at 200 for old
  // orders that predate the deliveryFee field.
  const driverPay = breakdown.deliveryFee
    ? breakdown.deliveryFee
    : Math.min(rawDriverPay, 200);

  // Scale each component proportionally so they still add up to driverPay
  // and the DeliveryEarning pre-save validation doesn't throw a mismatch error.
  const scale = rawDriverPay > 0 ? driverPay / rawDriverPay : 1;

  const basePay = parseFloat((rawBasePay * scale).toFixed(2));
  const distancePay = parseFloat((rawDistancePay * scale).toFixed(2));
  const surgeBonus = parseFloat((rawSurgeBonus * scale).toFixed(2));

  // Recalculate total from scaled components + tip to avoid floating point
  // drift that would fail the pre-save mismatch check (tolerance: 0.01)
  const totalEarning = parseFloat(
    (basePay + distancePay + surgeBonus + tipAmount).toFixed(2),
  );

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
