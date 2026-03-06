import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10,15}$/, "Invalid phone number"],
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minLength: 5,
      maxLength: 500,
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },

    reply: {
      message: {
        type: String,
        trim: true,
        maxLength: 1000,
      },
      repliedAt: Date,
    }
  },
  { timestamps: true },
);

const Contact = mongoose.model("Contact", ContactSchema);

export default Contact;
