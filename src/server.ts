import dotenv from "dotenv";
dotenv.config();
import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { initSocket } from "./socket/socket.handler";

// =============================================
// Uncaught Exception
// =============================================
process.on("uncaughtException", (err: Error) => {
  console.error("UNCAUGHT EXCEPTION:", err.name, err.message);
  process.exit(1);
});
// =============================================
// Start Server
// =============================================
const startServer = async (): Promise<void> => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  const httpServer = http.createServer(app);

  // Socket.io initialize
  initSocket(httpServer);
  console.log("🔌 Socket.io initialized");

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // =============================================
  // Unhandled Rejection
  // =============================================
  process.on("unhandledRejection", (err: Error) => {
    console.error("UNHANDLED REJECTION:", err.name, err.message);
    httpServer.close(() => process.exit(1));
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM. Graceful shutdown...");
    httpServer.close(() => console.log("Server has gone down"));
  });
};

startServer();
