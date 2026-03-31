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
import { startDailyPayoutJob } from "./jobs/dailyPayoutJob.js";
import { razorpayWebhook } from "./controllers/webhookController.js";
import deliveryEarningRoutes from "./routes/deliveryEarningRoutes.js";
import dailyPayoutRoutes from "./routes/dailyPayoutRoutes.js";
import { initSocketServer } from "./sockets/socketServer.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import sanitizeBody from "./middleware/sanitizeMiddleware.js";
import cartRoutes from "./routes/cartRoutes.js";
import deliveryRatingRoutes from "./routes/deliveryRatingRoutes.js";
import deliveryConfigRoutes from "./routes/deliveryConfigRoutes.js";

const app = express();

// webhook route must come before express.json() and also be isolated
app.post(
  "/api/v1/webhook/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhook,
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(sanitizeBody);
app.use(mongoSanitize());
app.use(hpp());

// Apply rate limiter to all api routes
app.use("/api/v1", apiLimiter);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/delivery-persons", deliveryPersonRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/flavours", flavourRoutes);
app.use("/api/v1/ice-creams", iceCreamRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/delivery-ratings", deliveryRatingRoutes);
app.use("/api/v1/delivery-earnings", deliveryEarningRoutes);
app.use("/api/v1/daily-payouts", dailyPayoutRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/delivery-config", deliveryConfigRoutes);

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

    startDailyPayoutJob();

    const keyPath = path.join(__dirname, "../localhost-key.pem");
    const certPath = path.join(__dirname, "../localhost.pem");

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.error("SSL files not found");
      process.exit(1);
    }

    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    const httpsServer = https.createServer(options, app);

    // initialize socket server
    initSocketServer(httpsServer);

    httpsServer.listen(PORT, () => {
      console.log(`HTTPS server running at https://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
