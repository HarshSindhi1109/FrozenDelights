import DeliveryConfig from "../models/DeliveryConfig.js";

/* ─────────────────────────────────────────────────────────────
   getConfig()
   Fetches the single global config document.
   Creates it with defaults if it doesn't exist yet (first run).
───────────────────────────────────────────────────────────── */
export const getConfig = async () => {
  let config = await DeliveryConfig.findOne();
  if (!config) {
    config = await DeliveryConfig.create({});
  }
  return config;
};

/* ─────────────────────────────────────────────────────────────
   haversineKm(lat1, lng1, lat2, lng2)
   Returns straight-line distance in km between two coordinates.
───────────────────────────────────────────────────────────── */
export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ─────────────────────────────────────────────────────────────
   calculateDeliveryFee({ customerLat, customerLng })

   Returns a full breakdown object:
   {
     distanceKm,       — actual distance in km (stored on order)
     basePay,          — flat base (goes to delivery person)
     distancePay,      — per-km amount (goes to delivery person)
     surgeBonus,       — surge add-on if active (goes to delivery person)
     deliveryFee,      — total charged to customer (sum of above)
     surgeEnabled,     — snapshot: was surge on at time of order?
     surgeMultiplier,  — snapshot: what multiplier was used?
   }

   This is called:
     1. orderController  — to calculate what to charge the customer
     2. deliveryEarningService — reads the frozen breakdown off the order
        (no recalculation needed after creation)
───────────────────────────────────────────────────────────── */
export const calculateDeliveryFee = async ({ customerLat, customerLng }) => {
  const config = await getConfig();

  const distanceKm = haversineKm(
    config.shopLat,
    config.shopLng,
    customerLat,
    customerLng,
  );

  const basePay = config.basePay;
  const distancePay = parseFloat((distanceKm * config.perKmRate).toFixed(2));

  // Surge applies as a multiplier on top of (base + distance)
  const preSurge = basePay + distancePay;
  const surgeMultiplier = config.surgeEnabled ? config.surgeMultiplier : 1;
  const surgeBonus = config.surgeEnabled
    ? parseFloat((preSurge * (surgeMultiplier - 1)).toFixed(2))
    : 0;

  const rawFee = preSurge + surgeBonus;

  // Clamp to min/max guardrails, then round to nearest rupee
  const deliveryFee = Math.round(
    Math.max(config.minDeliveryFee, Math.min(config.maxDeliveryFee, rawFee)),
  );

  const scale = rawFee > 0 ? deliveryFee / rawFee : 1;

  return {
    distanceKm: parseFloat(distanceKm.toFixed(3)),
    basePay: parseFloat((basePay * scale).toFixed(2)),
    distancePay: parseFloat((distancePay * scale).toFixed(2)),
    surgeBonus: parseFloat((surgeBonus * scale).toFixed(2)),
    deliveryFee,
    surgeEnabled: config.surgeEnabled,
    surgeMultiplier,
  };
};
