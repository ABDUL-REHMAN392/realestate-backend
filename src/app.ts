import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import propertyRoutes from "./routes/property.routes";
import agentRoutes from "./routes/agent.routes";
import chatRoutes from "./routes/chat.routes";
import inquiryRoutes from "./routes/inquiry.routes";
import favoriteRoutes from "./routes/favorite.routes";
import alertRoutes from "./routes/alert.routes";
import bookingRoutes from "./routes/booking.routes";
import {
  globalErrorHandler,
  handleMongooseErrors,
  AppError,
} from "./utils/errorHandler";
const app = express();

// =============================================
// Security
// =============================================
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

// =============================================
// Body & Cookie Parsing
// =============================================
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// =============================================
// Health Check
// =============================================
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Real Estate Backend API is running!",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// =============================================
// API Routes
// =============================================
app.use("/api/v1/auth", authRoutes); // Register, Login, Refresh, Logout, ChangePassword
app.use("/api/v1/users", userRoutes); // Profile, Avatar, Admin user management
app.use("/api/v1/properties", propertyRoutes); // Property CRUD, Search, Images
app.use("/api/v1/agents", agentRoutes); // Agent profiles, Reviews, Admin verify
app.use("/api/v1/chat", chatRoutes); // Real-time Chat + WebSocket
app.use("/api/v1/inquiries", inquiryRoutes); // Inquiry system
app.use("/api/v1/favorites", favoriteRoutes); // Save properties
app.use("/api/v1/alerts", alertRoutes); // Price alerts
app.use("/api/v1/bookings",   bookingRoutes);   // Property visit scheduling

// =============================================
// 404
// =============================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

// =============================================
// Global Error Handler
// =============================================
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const error = handleMongooseErrors(err);
  globalErrorHandler(error, req, res, next);
});

export default app;
