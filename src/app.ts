import express, { Application, Request, Response } from "express";

const app: Application = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Test Route
app.get("/", (req: Request, res: Response) => {
  console.log("✅ GET / route hit!");
  res.json({ message: "Real Estate Backend chal raha hai 🏠" });
});

// Server Start
app.listen(PORT, () => {
  console.log(`🏠  Real Estate Backend`);

});