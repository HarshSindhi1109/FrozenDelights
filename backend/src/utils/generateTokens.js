import jwt from "jsonwebtoken";
import crypto from "crypto";

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      tokenVersion: user.tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "2d",
    },
  );
};

// Generate CSRF token
export const generateCsrfToken = (jwtToken) => {
  return crypto
    .createHmac("sha256", process.env.CSRF_SECRET)
    .update(jwtToken)
    .digest("hex");
};
