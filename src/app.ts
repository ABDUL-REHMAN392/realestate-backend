import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
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
