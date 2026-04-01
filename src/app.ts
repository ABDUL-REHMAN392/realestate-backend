import express from 'express';
import cors from 'cors';

const app = express();

// Basic Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'Real Estate Backend API is running! 🚀' });
});

export default app;