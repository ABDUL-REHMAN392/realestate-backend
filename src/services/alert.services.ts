import mongoose from "mongoose";
import PriceAlert, { IPriceAlert } from "../models/alert.models";
import { AppError } from "../utils/errorHandler";
import { PaginationResult } from "../types";

export const createPriceAlert = async (
  userId: string,
  data: {
    city: string;
    purpose: "sale" | "rent";
    type?: IPriceAlert["type"];
    maxPrice: number;
    minBedrooms?: number;
  },
): Promise<IPriceAlert> => {
  const activeCount = await PriceAlert.countDocuments({
    user: new mongoose.Types.ObjectId(userId),
    isActive: true,
  });

  if (activeCount >= 10) {
    throw new AppError(
      "You can have at most 10 active price alerts. Please delete one before adding a new one.",
      400,
    );
  }

  const alert = await PriceAlert.create({
    user: userId,
    city: data.city.trim(),
    purpose: data.purpose,
    type: data.type ?? undefined,
    maxPrice: data.maxPrice,
    minBedrooms: data.minBedrooms ?? undefined,
    isActive: true,
  });

  return alert;
};

export const getMyAlerts = async (
  userId: string,
  page = 1,
  limit = 10,
): Promise<PaginationResult<IPriceAlert>> => {
  const skip = (page - 1) * limit;
  const filter = { user: new mongoose.Types.ObjectId(userId) };

  const [data, total] = await Promise.all([
    PriceAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IPriceAlert[]>(),
    PriceAlert.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const updatePriceAlert = async (
  alertId: string,
  userId: string,
  data: Partial<{
    city: string;
    purpose: "sale" | "rent";
    type: IPriceAlert["type"];
    maxPrice: number;
    minBedrooms: number;
    isActive: boolean;
  }>,
): Promise<IPriceAlert> => {
  if (!mongoose.Types.ObjectId.isValid(alertId)) {
    throw new AppError("Invalid alert ID", 400);
  }

  const alert = await PriceAlert.findOne({
    _id: alertId,
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!alert) throw new AppError("Price alert not found", 404);

  const updated = await PriceAlert.findByIdAndUpdate(
    alertId,
    { $set: data },
    { new: true, runValidators: true },
  ).lean<IPriceAlert>();

  return updated!;
};

export const deletePriceAlert = async (
  alertId: string,
  userId: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(alertId)) {
    throw new AppError("Invalid alert ID", 400);
  }

  const result = await PriceAlert.deleteOne({
    _id: alertId,
    user: new mongoose.Types.ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throw new AppError("Price alert not found", 404);
  }
};

export const findMatchingAlerts = async (propertyData: {
  city: string;
  purpose: "sale" | "rent";
  type: string;
  price: number;
  bedrooms?: number;
}): Promise<IPriceAlert[]> => {
  const query: Record<string, unknown> = {
    isActive: true,
    city: { $regex: new RegExp(`^${propertyData.city}$`, "i") },
    purpose: propertyData.purpose,
    maxPrice: { $gte: propertyData.price },
    $or: [{ type: null }, { type: undefined }, { type: propertyData.type }],
  };

  if (propertyData.bedrooms !== undefined) {
    (query.$and as unknown[]) = [
      {
        $or: [
          { minBedrooms: null },
          { minBedrooms: undefined },
          { minBedrooms: { $lte: propertyData.bedrooms } },
        ],
      },
    ];
  }

  return PriceAlert.find(query)
    .populate("user", "name email")
    .lean<IPriceAlert[]>();
};
