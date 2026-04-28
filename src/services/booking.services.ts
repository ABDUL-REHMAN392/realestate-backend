import mongoose from "mongoose";
import Booking, { IBooking } from "../models/booking.models";
import Property from "../models/property.models";
import { AppError } from "../utils/errorHandler";
import { createNotification } from "./notification.services";

// =============================================
// CREATE BOOKING — buyer schedules visit
// =============================================
export const createBooking = async (
  buyerId: string,
  data: { propertyId: string; date: string; timeSlot: string; note?: string },
): Promise<IBooking> => {
  if (!mongoose.Types.ObjectId.isValid(data.propertyId))
    throw new AppError("Invalid property ID", 400);

  const property = await Property.findById(data.propertyId);
  if (!property) throw new AppError("Property not found", 404);
  if (property.status !== "active")
    throw new AppError("Property is not available for booking", 400);

  const agentId = property.owner.toString();
  if (agentId === buyerId)
    throw new AppError("You cannot book your own property", 400);

  const visitDate = new Date(data.date);
  const dayStart  = new Date(visitDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd    = new Date(visitDate); dayEnd.setHours(23, 59, 59, 999);

  // Check: same slot already taken
  const slotTaken = await Booking.findOne({
    property: data.propertyId,
    agent:    agentId,
    date:     { $gte: dayStart, $lte: dayEnd },
    timeSlot: data.timeSlot,
    status:   { $in: ["pending","confirmed"] },
  });
  if (slotTaken)
    throw new AppError("This time slot is already booked. Please choose another.", 409);

  // Check: buyer already has active booking for this property
  const buyerActive = await Booking.findOne({
    property: data.propertyId,
    buyer:    buyerId,
    status:   { $in: ["pending","confirmed"] },
  });
  if (buyerActive)
    throw new AppError("You already have a pending booking for this property", 409);

  const booking = await Booking.create({
    property: data.propertyId,
    buyer:    buyerId,
    agent:    agentId,
    date:     new Date(data.date),
    timeSlot: data.timeSlot,
    note:     data.note,
    status:   "pending",
  });

  // 🔔 Notify agent
  createNotification({
    recipientId: agentId,
    type: "booking_created",
    title: "New Visit Booking",
    body: `A buyer wants to visit "${property.title}" on ${new Date(data.date).toLocaleDateString()}`,
    link: "/dashboard/bookings",
  }).catch(() => {});

  return Booking.findById(booking._id)
    .populate("property", "title address images price purpose")
    .populate("buyer",    "name email photo phone")
    .populate("agent",    "name email photo phone")
    .then((b) => b!);
};

// =============================================
// GET BUYER BOOKINGS
// =============================================
export const getBuyerBookings = async (
  buyerId: string,
  status?: string,
): Promise<IBooking[]> => {
  const query: Record<string, unknown> = { buyer: buyerId };
  if (status) query.status = status;

  return Booking.find(query)
    .sort({ date: 1 })
    .populate("property", "title address images price purpose")
    .populate("agent",    "name email photo phone");
};

// =============================================
// GET AGENT BOOKINGS
// =============================================
export const getAgentBookings = async (
  agentId: string,
  status?: string,
): Promise<IBooking[]> => {
  const query: Record<string, unknown> = { agent: agentId };
  if (status) query.status = status;

  return Booking.find(query)
    .sort({ date: 1 })
    .populate("property", "title address images price purpose")
    .populate("buyer",    "name email photo phone");
};

// =============================================
// CONFIRM BOOKING — agent
// =============================================
export const confirmBooking = async (
  bookingId: string,
  agentId: string,
  agentNote?: string,
): Promise<IBooking> => {
  if (!mongoose.Types.ObjectId.isValid(bookingId))
    throw new AppError("Invalid booking ID", 400);

  const booking = await Booking.findById(bookingId);
  if (!booking)                              throw new AppError("Booking not found", 404);
  if (booking.agent.toString() !== agentId)  throw new AppError("Not authorized", 403);
  if (booking.status !== "pending")          throw new AppError("Only pending bookings can be confirmed", 400);

  booking.status    = "confirmed";
  booking.agentNote = agentNote;
  await booking.save();

  // 🔔 Notify buyer
  createNotification({
    recipientId: booking.buyer.toString(),
    type: "booking_confirmed",
    title: "Booking Confirmed! 🎉",
    body: `Your visit has been confirmed by the agent`,
    link: "/dashboard/bookings",
  }).catch(() => {});

  return Booking.findById(bookingId)
    .populate("property", "title address images")
    .populate("buyer",    "name email photo phone")
    .populate("agent",    "name email photo phone")
    .then((b) => b!);
};

// =============================================
// REJECT BOOKING — agent
// =============================================
export const rejectBooking = async (
  bookingId: string,
  agentId: string,
  rejectionReason: string,
): Promise<IBooking> => {
  if (!mongoose.Types.ObjectId.isValid(bookingId))
    throw new AppError("Invalid booking ID", 400);

  const booking = await Booking.findById(bookingId);
  if (!booking)                             throw new AppError("Booking not found", 404);
  if (booking.agent.toString() !== agentId) throw new AppError("Not authorized", 403);
  if (booking.status !== "pending")         throw new AppError("Only pending bookings can be rejected", 400);

  booking.status          = "rejected";
  booking.rejectionReason = rejectionReason;
  await booking.save();

  // 🔔 Notify buyer
  createNotification({
    recipientId: booking.buyer.toString(),
    type: "booking_rejected",
    title: "Booking Not Confirmed",
    body: `Your visit request was declined: ${rejectionReason}`,
    link: "/dashboard/bookings",
  }).catch(() => {});

  return Booking.findById(bookingId)
    .populate("property", "title address images")
    .populate("buyer",    "name email photo phone")
    .then((b) => b!);
};

// =============================================
// CANCEL BOOKING — buyer or agent
// =============================================
export const cancelBooking = async (
  bookingId: string,
  userId: string,
  userRole: string,
): Promise<IBooking> => {
  if (!mongoose.Types.ObjectId.isValid(bookingId))
    throw new AppError("Invalid booking ID", 400);

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError("Booking not found", 404);

  const isBuyer = booking.buyer.toString() === userId;
  const isAgent = booking.agent.toString() === userId;

  if (!isBuyer && !isAgent && userRole !== "admin")
    throw new AppError("Not authorized", 403);

  if (!["pending","confirmed"].includes(booking.status))
    throw new AppError("Cannot cancel a completed or already cancelled booking", 400);

  booking.status      = "cancelled";
  booking.cancelledBy = isBuyer ? "buyer" : "agent";
  await booking.save();

  return Booking.findById(bookingId)
    .populate("property", "title address images")
    .populate("buyer",    "name email photo phone")
    .populate("agent",    "name email photo phone")
    .then((b) => b!);
};

// =============================================
// COMPLETE BOOKING — agent
// =============================================
export const completeBooking = async (
  bookingId: string,
  agentId: string,
): Promise<IBooking> => {
  if (!mongoose.Types.ObjectId.isValid(bookingId))
    throw new AppError("Invalid booking ID", 400);

  const booking = await Booking.findById(bookingId);
  if (!booking)                             throw new AppError("Booking not found", 404);
  if (booking.agent.toString() !== agentId) throw new AppError("Not authorized", 403);
  if (booking.status !== "confirmed")       throw new AppError("Only confirmed bookings can be completed", 400);

  booking.status = "completed";
  await booking.save();

  return Booking.findById(bookingId)
    .populate("property", "title address images")
    .populate("buyer",    "name email photo phone")
    .then((b) => b!);
};

// =============================================
// GET BOOKED SLOTS — public, for date picker
// =============================================
export const getBookedSlots = async (
  propertyId: string,
  date: string,
): Promise<string[]> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId))
    throw new AppError("Invalid property ID", 400);

  const visitDate = new Date(date);
  const dayStart  = new Date(visitDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd    = new Date(visitDate); dayEnd.setHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    property: propertyId,
    date:     { $gte: dayStart, $lte: dayEnd },
    status:   { $in: ["pending","confirmed"] },
  }).select("timeSlot");

  return bookings.map((b) => b.timeSlot);
};