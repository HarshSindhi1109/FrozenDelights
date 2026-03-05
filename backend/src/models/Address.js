import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullname: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    addressType: {
      type: String,
      enum: ["home", "work", "shop", "other"],
      default: "home",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    // GeoJSON location (for delivery routing)
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  { timestamps: true },
);

// fast lookup for user's addresses
AddressSchema.index({ userId: 1 });

// ensures only one default address per user
AddressSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

// geospatial queries
AddressSchema.index({ location: "2dsphere" });

const Address = mongoose.model("Address", AddressSchema);

export default Address;
