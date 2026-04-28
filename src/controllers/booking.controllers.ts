import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess } from "../utils/apiResponse";
import * as bookingService from "../services/booking.services";

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// POST /api/v1/bookings
export const createBookingHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await bookingService.createBooking(String(req.user!._id), {
    propertyId: req.body.propertyId,
    date:       req.body.date,
    timeSlot:   req.body.timeSlot,
    note:       req.body.note,
  });
  sendSuccess(res, { booking }, "Visit scheduled. Waiting for agent confirmation.", 201);
});

// GET /api/v1/bookings/my
export const getMyBookingsHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const bookings = await bookingService.getBuyerBookings(
    String(req.user!._id),
    req.query.status as string | undefined,
  );
  sendSuccess(res, { bookings }, "Bookings retrieved");
});

// GET /api/v1/bookings/agent
export const getAgentBookingsHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const bookings = await bookingService.getAgentBookings(
    String(req.user!._id),
    req.query.status as string | undefined,
  );
  sendSuccess(res, { bookings }, "Bookings retrieved");
});

// PATCH /api/v1/bookings/:id/confirm
export const confirmBookingHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await bookingService.confirmBooking(
    p(req.params.id),
    String(req.user!._id),
    req.body.agentNote,
  );
  sendSuccess(res, { booking }, "Booking confirmed");
});

// PATCH /api/v1/bookings/:id/reject
export const rejectBookingHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.body.rejectionReason?.trim())
    throw new Error("Rejection reason is required");
  const booking = await bookingService.rejectBooking(
    p(req.params.id),
    String(req.user!._id),
    req.body.rejectionReason,
  );
  sendSuccess(res, { booking }, "Booking rejected");
});

// PATCH /api/v1/bookings/:id/cancel
export const cancelBookingHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await bookingService.cancelBooking(
    p(req.params.id),
    String(req.user!._id),
    req.user!.role,
  );
  sendSuccess(res, { booking }, "Booking cancelled");
});

// PATCH /api/v1/bookings/:id/complete
export const completeBookingHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const booking = await bookingService.completeBooking(
    p(req.params.id),
    String(req.user!._id),
  );
  sendSuccess(res, { booking }, "Booking completed");
});

// GET /api/v1/bookings/slots?propertyId=&date=
export const getBookedSlotsHandler = catchAsync(async (req: AuthRequest, res: Response) => {
  const slots = await bookingService.getBookedSlots(
    req.query.propertyId as string,
    req.query.date as string,
  );
  sendSuccess(res, { bookedSlots: slots }, "Booked slots retrieved");
});