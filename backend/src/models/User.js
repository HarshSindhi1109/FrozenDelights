import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    password: {
      type: String,
      minlength: 6,
      required: function () {
        return this.authProvider === "local";
      },
      select: false,
    },

    googleId: {
      type: String,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["customer", "delivery_man", "admin"],
      default: "customer",
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model("User", UserSchema);

export default User;
