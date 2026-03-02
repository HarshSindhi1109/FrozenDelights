import { body, validationResult } from "express-validator";
import AppError from "../utils/AppError.js";

// Register validation rules
export const validateRegister = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters")
    .escape(),

  body("email").isEmail().withMessage("Invalid email format").normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// Middleware to check validation result
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  next();
};
