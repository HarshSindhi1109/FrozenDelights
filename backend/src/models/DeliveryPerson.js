import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/encryption.js";

const DeliveryPersonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullname: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    vehicleType: {
      type: String,
      enum: ["bicycle", "e_bike", "scooter", "e_scooter", "motorcycle"],
    },

    govtIdUrl: {
      type: String,
      required: true,
    },

    drivingLicenseUrl: {
      type: String,
      required: function () {
        return ["scooter", "motorcycle", "e_scooter"].includes(
          this.vehicleType,
        );
      },
    },

    vehicleRegistrationUrl: {
      type: String,
      required: function () {
        return ["scooter", "motorcycle", "e_scooter"].includes(
          this.vehicleType,
        );
      },
    },

    profilePicUrl: {
      type: String,
      required: true,
    },

    bankDetails: {
      bankName: {
        type: String,
        required: true,
      },

      accountNumber: {
        type: String,
        required: true,
      },

      ifscCode: {
        type: String,
        required: true,
      },

      upiId: String,
    },

    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    suspension: {
      from: Date,
      to: Date,
      reason: String,
    },

    status: {
      type: String,
      enum: ["pending", "active", "suspended", "inactive", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

DeliveryPersonSchema.pre("save", function (next) {
  if (this.isModified("bankDetails.accountNumber")) {
    this.bankDetails.accountNumber = encrypt(this.bankDetails.accountNumber);
  }

  if (this.isModified("bankDetails.ifscCode")) {
    this.bankDetails.ifscCode = encrypt(this.bankDetails.ifscCode);
  }

  next();
});

DeliveryPersonSchema.methods.getDecryptedBankDetails = function () {
  return {
    bankName: this.bankDetails.bankName,
    accountNumber: decrypt(this.bankDetails.accountNumber),
    ifscCode: decrypt(this.bankDetails.ifscCode),
    upiId: this.bankDetails.upiId,
  };
};

DeliveryPersonSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    fullname: this.fullname,
    phone: this.phone,
    vehicleType: this.vehicleType,
    govtIdUrl: this.govtIdUrl,
    drivingLicenseUrl: this.drivingLicenseUrl,
    vehicleRegistrationUrl: this.vehicleRegistrationUrl,
    profilePicUrl: this.profilePicUrl,
    bankDetails: this.getDecryptedBankDetails(),
    averageRating: this.averageRating,
    totalReviews: this.totalReviews,
    status: this.status,
  };
};

DeliveryPersonSchema.index({ userId: 1 });

const DeliveryPerson = mongoose.model("DeliveryPerson", DeliveryPersonSchema);

export default DeliveryPerson;
