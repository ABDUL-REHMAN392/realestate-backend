import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import { deleteFromCloudinary } from "../utils/cloudinary";
import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  addPropertyImages,
  deletePropertyImage,
  setPrimaryImage,
  getMyProperties,
  toggleFeatured,
  changePropertyStatus,
  PropertyFilters,
} from "../services/property.services";

// HELPER — parse numeric query param safely
const toNum = (val: unknown): number | undefined => {
  const n = Number(val);
  return val !== undefined && val !== "" && !isNaN(n) ? n : undefined;
};

// HELPER — Express 5: req.params values are string | string[]
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// =============================================
// POST /api/v1/properties  — agent | admin
// =============================================
export const createPropertyHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await createProperty(req.body, req.user!._id.toString());
    sendSuccess(res, property, "Property created successfully", 201);
  },
);

// =============================================
// GET /api/v1/properties  — public
// =============================================
export const getPropertiesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const filters: PropertyFilters = {
      purpose: req.query.purpose as "sale" | "rent" | undefined,
      type: req.query.type as string | undefined,
      city: req.query.city as string | undefined,
      minPrice: toNum(req.query.minPrice),
      maxPrice: toNum(req.query.maxPrice),
      minArea: toNum(req.query.minArea),
      maxArea: toNum(req.query.maxArea),
      bedrooms: toNum(req.query.bedrooms),
      bathrooms: toNum(req.query.bathrooms),
      search: req.query.search as string | undefined,
      lat: toNum(req.query.lat),
      lng: toNum(req.query.lng),
      radius: toNum(req.query.radius),
      page: toNum(req.query.page) ?? 1,
      limit: toNum(req.query.limit) ?? 10,
      sortBy: req.query.sortBy as PropertyFilters["sortBy"],
    };
    const result = await getProperties(filters);
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET /api/v1/properties/:id  — public
// =============================================
export const getPropertyHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await getPropertyById(p(req.params.id));
    sendSuccess(res, property, "Property retrieved successfully");
  },
);

// =============================================
// PATCH /api/v1/properties/:id  — owner | admin
// =============================================
export const updatePropertyHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await updateProperty(
      p(req.params.id),
      req.body,
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, property, "Property updated successfully");
  },
);

// =============================================
// DELETE /api/v1/properties/:id  — owner | admin
// =============================================
export const deletePropertyHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await getPropertyById(p(req.params.id));
    await Promise.allSettled(
      property.images.map((img) => deleteFromCloudinary(img.publicId)),
    );
    await deleteProperty(
      p(req.params.id),
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, null, "Property deleted successfully");
  },
);

// =============================================
// POST /api/v1/properties/:id/images  — agent | admin
// =============================================
export const addImagesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      sendSuccess(res, null, "No images uploaded", 400);
      return;
    }
    const images = files.map((file) => {
      const f = file as Express.Multer.File & {
        path: string;
        filename: string;
      };
      return { url: f.path, publicId: f.filename, isPrimary: false };
    });
    const property = await addPropertyImages(
      p(req.params.id),
      images,
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, property, "Images added successfully");
  },
);

// =============================================
// DELETE /api/v1/properties/:id/images/:publicId  — owner | admin
// =============================================
export const deleteImageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const id = p(req.params.id);
    const publicId = decodeURIComponent(p(req.params.publicId));
    await deleteFromCloudinary(publicId);
    const property = await deletePropertyImage(
      id,
      publicId,
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, property, "Image deleted successfully");
  },
);

// =============================================
// PATCH /api/v1/properties/:id/images/:publicId/primary  — owner | admin
// =============================================
export const setPrimaryImageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await setPrimaryImage(
      p(req.params.id),
      decodeURIComponent(p(req.params.publicId)),
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, property, "Primary image updated");
  },
);

// =============================================
// GET /api/v1/properties/my/listings  — logged in
// =============================================
export const getMyPropertiesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getMyProperties(req.user!._id.toString(), {
      page: toNum(req.query.page) ?? 1,
      limit: toNum(req.query.limit) ?? 10,
      sortBy: req.query.sortBy as PropertyFilters["sortBy"],
    });
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// PATCH /api/v1/properties/:id/featured  — admin only
// =============================================
export const toggleFeaturedHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await toggleFeatured(p(req.params.id));
    sendSuccess(
      res,
      property,
      `Property ${property.isFeatured ? "marked as" : "removed from"} featured`,
    );
  },
);

// =============================================
// PATCH /api/v1/properties/:id/status  — admin only
// =============================================
export const changeStatusHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const property = await changePropertyStatus(
      p(req.params.id),
      req.body.status,
    );
    sendSuccess(
      res,
      property,
      `Property status updated to '${property.status}'`,
    );
  },
);
