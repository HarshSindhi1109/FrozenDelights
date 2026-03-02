import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
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
      enum: ["pending", "in-progess", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const Contact = mongoose.model("Contact", ContactSchema);

export default Contact;
