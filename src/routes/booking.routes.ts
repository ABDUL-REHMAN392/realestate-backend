import { Router } from "express";
import {
  createBookingHandler,
  getMyBookingsHandler,
  getAgentBookingsHandler,
  confirmBookingHandler,
  rejectBookingHandler,
  cancelBookingHandler,
  completeBookingHandler,
  getBookedSlotsHandler,
} from "../controllers/booking.controllers";
import { protect, allowOnly } from "../middlewares/auth.middlewares";

const router = Router();

router.use(protect);

// Check booked slots — any logged-in user
router.get("/slots", getBookedSlotsHandler);

// Buyer
router.post("/",     allowOnly("buyer"), createBookingHandler);
router.get("/my",    allowOnly("buyer"), getMyBookingsHandler);

// Agent
router.get("/agent", allowOnly("agent"), getAgentBookingsHandler);
router.patch("/:id/confirm",  allowOnly("agent"), confirmBookingHandler);
router.patch("/:id/reject",   allowOnly("agent"), rejectBookingHandler);
router.patch("/:id/complete", allowOnly("agent"), completeBookingHandler);

// Both buyer and agent can cancel
router.patch("/:id/cancel", cancelBookingHandler);

export default router;