// Load env
import "./config/env.js";

// import libraries
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";

// import files
import connectDB from "./config/db.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import AppError from "./utils/AppError.js";
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import { apiLimiter } from "./middleware/rateLimitMiddleware.js";
import deliveryPersonRoutes from "./routes/deliveryPersonRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import flavourRoutes from "./routes/flavourRoutes.js";
import iceCreamRoutes from "./routes/iceCreamRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Apply rate limiter to all api routes
app.use("/api/v1", apiLimiter);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/delivery", deliveryPersonRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/flavours", flavourRoutes);
app.use("/api/v1/ice-creams", iceCreamRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);

// Images can be accessed by browser
app.use("/uploads", express.static("uploads"));

// Handle unknown routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

// Global error handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startServer = async () => {
  try {
    await connectDB();

    if (!fs.existsSync(path.join(__dirname, "../key.pem"))) {
      console.error("SSL files not found");
      process.exit(1);
    }

    const options = {
      key: fs.readFileSync(path.join(__dirname, "../key.pem")),
      cert: fs.readFileSync(path.join(__dirname, "../cert.pem")),
    };

    https.createServer(options, app).listen(PORT, () => {
      console.log(`HTTPS server running at https://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
