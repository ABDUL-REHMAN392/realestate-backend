import mongoose from "mongoose";
import Property, { IProperty, IPropertyImage } from "../models/property.models";
import { AppError } from "../utils/errorHandler";
import { PaginationResult } from "../types";

// =============================================
// Filters Interface
// =============================================
export interface PropertyFilters {
  purpose?: "sale" | "rent";
  type?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  status?: string;
  search?: string; // text search in title/description
  lat?: number; // geospatial center
  lng?: number;
  radius?: number; // km
  page?: number;
  limit?: number;
  sortBy?: "price_asc" | "price_desc" | "newest" | "oldest" | "views";
}

// =============================================
// Build Mongoose Filter Query
// =============================================
const buildQuery = (filters: PropertyFilters): Record<string, unknown> => {
  const query: Record<string, unknown> = {};

  // Only show active by default (unless admin sets status explicitly)
  query.status = filters.status ?? "active";

  if (filters.purpose) query.purpose = filters.purpose;
  if (filters.type) query.type = filters.type;
  if (filters.city)
    query["address.city"] = { $regex: new RegExp(filters.city, "i") };
  if (filters.bedrooms !== undefined)
    query.bedrooms = { $gte: filters.bedrooms };
  if (filters.bathrooms !== undefined)
    query.bathrooms = { $gte: filters.bathrooms };

  // Price range
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceQuery: Record<string, number> = {};
    if (filters.minPrice !== undefined) priceQuery.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) priceQuery.$lte = filters.maxPrice;
    query.price = priceQuery;
  }

  // Area range
  if (filters.minArea !== undefined || filters.maxArea !== undefined) {
    const areaQuery: Record<string, number> = {};
    if (filters.minArea !== undefined) areaQuery.$gte = filters.minArea;
    if (filters.maxArea !== undefined) areaQuery.$lte = filters.maxArea;
    query.area = areaQuery;
  }

  // Text search
  if (filters.search) {
    query.$or = [
      { title: { $regex: new RegExp(filters.search, "i") } },
      { description: { $regex: new RegExp(filters.search, "i") } },
    ];
  }

  // Geospatial — near a lat/lng within radius km
  if (
    filters.lat !== undefined &&
    filters.lng !== undefined &&
    filters.radius !== undefined
  ) {
    query.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [filters.lng, filters.lat] },
        $maxDistance: filters.radius * 1000, // km → meters
      },
    };
  }

  return query;
};

// =============================================
// Build Sort Options
// =============================================
const buildSort = (sortBy?: string): Record<string, 1 | -1> => {
  switch (sortBy) {
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "oldest":
      return { createdAt: 1 };
    case "views":
      return { views: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
};

// =============================================
// CREATE PROPERTY
// =============================================
export const createProperty = async (
  data: Partial<IProperty>,
  ownerId: string,
): Promise<IProperty> => {
  const property = await Property.create({ ...data, owner: ownerId });
  return property;
};

// =============================================
// GET ALL PROPERTIES (paginated + filtered)
// =============================================
export const getProperties = async (
  filters: PropertyFilters,
): Promise<PaginationResult<IProperty>> => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const query = buildQuery(filters);
  const sort = buildSort(filters.sortBy);

  const [data, total] = await Promise.all([
    Property.find(query)
      .populate("owner", "name email photo phone role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(query),
  ]);

  return {
    data: data as unknown as IProperty[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// =============================================
// GET SINGLE PROPERTY (+ increment views)
// =============================================
export const getPropertyById = async (id: string): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { returnDocument: "after" },
  ).populate("owner", "name email photo phone role");

  if (!property) throw new AppError("Property not found", 404);
  return property;
};

// =============================================
// UPDATE PROPERTY
// =============================================
export const updateProperty = async (
  id: string,
  data: Partial<IProperty>,
  userId: string,
  userRole: string,
): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(id);
  if (!property) throw new AppError("Property not found", 404);

  // Only owner or admin can update
  if (property.owner.toString() !== userId && userRole !== "admin") {
    throw new AppError("You are not authorized to update this property", 403);
  }

  // Prevent changing owner
  delete (data as Record<string, unknown>).owner;
  delete (data as Record<string, unknown>).views;

  const updated = await Property.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).populate("owner", "name email photo phone role");

  if (!updated) throw new AppError("Property not found", 404);
  return updated;
};

// =============================================
// DELETE PROPERTY
// =============================================
export const deleteProperty = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(id);
  if (!property) throw new AppError("Property not found", 404);

  if (property.owner.toString() !== userId && userRole !== "admin") {
    throw new AppError("You are not authorized to delete this property", 403);
  }

  await property.deleteOne();
};

// =============================================
// ADD IMAGES TO PROPERTY
// =============================================
export const addPropertyImages = async (
  id: string,
  images: IPropertyImage[],
  userId: string,
  userRole: string,
): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(id);
  if (!property) throw new AppError("Property not found", 404);

  if (property.owner.toString() !== userId && userRole !== "admin") {
    throw new AppError("Not authorized to update this property", 403);
  }

  if (property.images.length + images.length > 15) {
    throw new AppError(
      `Cannot add ${images.length} image(s). Max 15 images allowed (currently ${property.images.length})`,
      400,
    );
  }

  // If no images yet, first uploaded becomes primary
  if (property.images.length === 0 && images.length > 0) {
    images[0].isPrimary = true;
  }

  property.images.push(...images);
  await property.save();
  return property;
};

// =============================================
// DELETE SINGLE IMAGE FROM PROPERTY
// =============================================
export const deletePropertyImage = async (
  propertyId: string,
  publicId: string,
  userId: string,
  userRole: string,
): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(propertyId);
  if (!property) throw new AppError("Property not found", 404);

  if (property.owner.toString() !== userId && userRole !== "admin") {
    throw new AppError("Not authorized to update this property", 403);
  }

  const imgIndex = property.images.findIndex(
    (img) => img.publicId === publicId,
  );
  if (imgIndex === -1)
    throw new AppError("Image not found on this property", 404);

  const wasPrimary = property.images[imgIndex].isPrimary;
  property.images.splice(imgIndex, 1);

  // If deleted image was primary, assign next one
  if (wasPrimary && property.images.length > 0) {
    property.images[0].isPrimary = true;
  }

  await property.save();
  return property;
};

// =============================================
// SET PRIMARY IMAGE
// =============================================
export const setPrimaryImage = async (
  propertyId: string,
  publicId: string,
  userId: string,
  userRole: string,
): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    throw new AppError("Invalid property ID", 400);
  }

  const property = await Property.findById(propertyId);
  if (!property) throw new AppError("Property not found", 404);

  if (property.owner.toString() !== userId && userRole !== "admin") {
    throw new AppError("Not authorized", 403);
  }

  const found = property.images.find((img) => img.publicId === publicId);
  if (!found) throw new AppError("Image not found on this property", 404);

  property.images.forEach((img) => (img.isPrimary = false));
  found.isPrimary = true;

  await property.save();
  return property;
};

// =============================================
// GET MY PROPERTIES (owner's listings)
// =============================================
export const getMyProperties = async (
  userId: string,
  filters: Omit<PropertyFilters, "status">,
): Promise<PaginationResult<IProperty>> => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;
  const sort = buildSort(filters.sortBy);

  const query: Record<string, unknown> = { owner: userId };

  const [data, total] = await Promise.all([
    Property.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Property.countDocuments(query),
  ]);

  return {
    data: data as unknown as IProperty[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// =============================================
// TOGGLE FEATURED (admin only)
// =============================================
export const toggleFeatured = async (id: string): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid property ID", 400);
  }
  const property = await Property.findById(id);
  if (!property) throw new AppError("Property not found", 404);

  property.isFeatured = !property.isFeatured;
  await property.save();
  return property;
};

// =============================================
// CHANGE STATUS (admin only)
// =============================================
export const changePropertyStatus = async (
  id: string,
  status: IProperty["status"],
): Promise<IProperty> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid property ID", 400);
  }
  const property = await Property.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: "after", runValidators: true },
  );
  if (!property) throw new AppError("Property not found", 404);
  return property;
};
