import mongoose from "mongoose";
import Inquiry, { IInquiry } from "../models/inquiry.models";
import Property from "../models/property.models";
import { AppError } from "../utils/errorHandler";
import { PaginationResult } from "../types";

export const sendInquiry = async (
  propertyId: string,
  senderId: string,
  message: string,
  phone?: string,
): Promise<IInquiry> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(propertyId).select("owner status");
  if (!property) throw new AppError("Property not found", 404);
  if (property.status !== "active") {
    throw new AppError("This property is no longer available", 400);
  }
  if (property.owner.toString() === senderId) {
    throw new AppError(
      "You cannot send an inquiry about your own property",
      400,
    );
  }

  const inquiry = await Inquiry.create({
    property: propertyId,
    sender: senderId,
    agent: property.owner,
    message: message.trim(),
    phone: phone ?? undefined,
  });

  const id = (inquiry as unknown as { _id: mongoose.Types.ObjectId })._id;
  const populated = await Inquiry.findById(id)
    .populate("property", "title images address.city purpose price")
    .populate("sender", "name email photo phone")
    .lean<IInquiry>();

  return populated!;
};

export const getMySentInquiries = async (
  userId: string,
  page = 1,
  limit = 10,
): Promise<PaginationResult<IInquiry>> => {
  const skip = (page - 1) * limit;
  const filter = { sender: new mongoose.Types.ObjectId(userId) };

  const [data, total] = await Promise.all([
    Inquiry.find(filter)
      .populate("property", "title images address.city purpose price status")
      .populate("agent", "name photo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IInquiry[]>(),
    Inquiry.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getReceivedInquiries = async (
  agentId: string,
  status: string | undefined,
  page = 1,
  limit = 10,
): Promise<PaginationResult<IInquiry>> => {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {
    agent: new mongoose.Types.ObjectId(agentId),
  };
  if (status) filter.status = status;

  const [data, total] = await Promise.all([
    Inquiry.find(filter)
      .populate("property", "title images address.city purpose price")
      .populate("sender", "name email photo phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IInquiry[]>(),
    Inquiry.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getInquiryById = async (
  inquiryId: string,
  userId: string,
  userRole: string,
): Promise<IInquiry> => {
  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new AppError("Invalid inquiry ID", 400);
  }

  const inquiry = await Inquiry.findById(inquiryId)
    .populate("property", "title images address purpose price")
    .populate("sender", "name email photo phone")
    .populate("agent", "name email photo")
    .lean<IInquiry>();

  if (!inquiry) throw new AppError("Inquiry not found", 404);

  const senderId =
    (inquiry.sender as any)?._id?.toString() ?? inquiry.sender.toString();
  const agentId =
    (inquiry.agent as any)?._id?.toString() ?? inquiry.agent.toString();

  const isAllowed =
    userRole === "admin" || senderId === userId || agentId === userId;

  if (!isAllowed) throw new AppError("Access denied", 403);
  return inquiry;
};

export const updateInquiryStatus = async (
  inquiryId: string,
  userId: string,
  userRole: string,
  status: IInquiry["status"],
): Promise<IInquiry> => {
  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new AppError("Invalid inquiry ID", 400);
  }

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) throw new AppError("Inquiry not found", 404);

  if (userRole !== "admin" && inquiry.agent.toString() !== userId) {
    throw new AppError(
      "Only the receiving agent or admin can update this inquiry",
      403,
    );
  }

  const updated = await Inquiry.findByIdAndUpdate(
    inquiryId,
    { $set: { status } },
    { new: true, runValidators: true },
  )
    .populate("property", "title images address.city purpose price")
    .populate("sender", "name email photo phone")
    .lean<IInquiry>();

  return updated!;
};

export const deleteInquiry = async (
  inquiryId: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
    throw new AppError("Invalid inquiry ID", 400);
  }

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) throw new AppError("Inquiry not found", 404);

  if (userRole !== "admin" && inquiry.sender.toString() !== userId) {
    throw new AppError("You can only delete your own inquiries", 403);
  }

  await inquiry.deleteOne();
};
