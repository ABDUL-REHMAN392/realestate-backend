import mongoose from "mongoose";
import Favorite, { IFavorite } from "../models/favorite.models";
import Property from "../models/property.models";
import { AppError } from "../utils/errorHandler";
import { PaginationResult } from "../types";

export const toggleFavorite = async (
  userId: string,
  propertyId: string,
): Promise<{ added: boolean; favorite: IFavorite | null }> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(propertyId).select("_id");
  if (!property) throw new AppError("Property not found", 404);

  const existing = await Favorite.findOne({
    user: new mongoose.Types.ObjectId(userId),
    property: new mongoose.Types.ObjectId(propertyId),
  });

  if (existing) {
    await existing.deleteOne();
    return { added: false, favorite: null };
  }

  const fav = await Favorite.create({ user: userId, property: propertyId });
  const id = (fav as unknown as { _id: mongoose.Types.ObjectId })._id;

  const populated = await Favorite.findById(id)
    .populate(
      "property",
      "title images address.city purpose price area areaUnit",
    )
    .lean<IFavorite>();

  return { added: true, favorite: populated };
};

export const getMyFavorites = async (
  userId: string,
  page = 1,
  limit = 10,
): Promise<PaginationResult<IFavorite>> => {
  const skip = (page - 1) * limit;
  const filter = { user: new mongoose.Types.ObjectId(userId) };

  const [data, total] = await Promise.all([
    Favorite.find(filter)
      .populate(
        "property",
        "title images address purpose price area areaUnit bedrooms bathrooms status type",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IFavorite[]>(),
    Favorite.countDocuments(filter),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const isFavorited = async (
  userId: string,
  propertyId: string,
): Promise<boolean> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) return false;

  const exists = await Favorite.exists({
    user: new mongoose.Types.ObjectId(userId),
    property: new mongoose.Types.ObjectId(propertyId),
  });

  return !!exists;
};

export const removeFavorite = async (
  userId: string,
  propertyId: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new AppError("Invalid property ID", 400);
  }

  const result = await Favorite.deleteOne({
    user: new mongoose.Types.ObjectId(userId),
    property: new mongoose.Types.ObjectId(propertyId),
  });

  if (result.deletedCount === 0) {
    throw new AppError("Property was not in your favorites", 404);
  }
};
