import mongoose from "mongoose";

// Single-document singleton — only one config exists for the whole app.
// Admin can update it; the app always reads the one document.
const DeliveryConfigSchema = new mongoose.Schema(
  {
    basePay: {
      type: Number,
      required: true,
      min: 0,
      default: 40, // ₹ flat fee every delivery starts with
    },

    perKmRate: {
      type: Number,
      required: true,
      min: 0,
      default: 6, // ₹ per km beyond the base
    },

    // Surge: admin manually toggles ON/OFF + sets multiplier
    surgeEnabled: {
      type: Boolean,
      default: false,
    },

    surgeMultiplier: {
      type: Number,
      min: 1,
      default: 1.5, // e.g. 1.5 = 50% more during surge
    },

    // Shop location — used for haversine distance calculation
    shopLat: {
      type: Number,
      required: true,
      default: 22.3072,
    },

    shopLng: {
      type: Number,
      required: true,
      default: 72.5714,
    },

    // Minimum delivery fee guardrail
    minDeliveryFee: {
      type: Number,
      default: 20,
    },

    // Maximum delivery fee guardrail (protects customers from absurd distances)
    maxDeliveryFee: {
      type: Number,
      default: 200,
    },
  },
  { timestamps: true },
);

const DeliveryConfig = mongoose.model("DeliveryConfig", DeliveryConfigSchema);

export default DeliveryConfig;
