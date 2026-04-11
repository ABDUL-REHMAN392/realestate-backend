import { Router } from "express";
import {
  createPropertyHandler,
  getPropertiesHandler,
  getPropertyHandler,
  updatePropertyHandler,
  deletePropertyHandler,
  addImagesHandler,
  deleteImageHandler,
  setPrimaryImageHandler,
  getMyPropertiesHandler,
  toggleFeaturedHandler,
  changeStatusHandler,
} from "../controllers/property.controllers";
import { protect, allowOnly } from "../middlewares/auth.middlewares";
import {
  validate,
  createPropertySchema,
  updatePropertySchema,
  propertyStatusSchema,
} from "../middlewares/validator.middlewares";
import { propertyImagesUploadMiddleware } from "../middlewares/upload.middlewares";

const router = Router();

// =============================================
// PUBLIC ROUTES
// =============================================

// GET /api/v1/properties?purpose=sale&city=Lahore&minPrice=5000000
router.get("/", getPropertiesHandler);

// GET /api/v1/properties/:id
router.get("/:id", getPropertyHandler);

// =============================================
// PROTECTED ROUTES — must be logged in
// =============================================
router.use(protect);

// GET /api/v1/properties/my  — own listings
router.get("/my/listings", getMyPropertiesHandler);

// POST /api/v1/properties — agent or admin only
router.post(
  "/",
  allowOnly("agent", "admin"),
  validate(createPropertySchema),
  createPropertyHandler,
);

// PATCH /api/v1/properties/:id — owner or admin
router.patch("/:id", validate(updatePropertySchema), updatePropertyHandler);

// DELETE /api/v1/properties/:id — owner or admin
router.delete("/:id", deletePropertyHandler);

// =============================================
// IMAGE ROUTES
// =============================================

// POST /api/v1/properties/:id/images — upload up to 10 images
router.post(
  "/:id/images",
  allowOnly("agent", "admin"),
  propertyImagesUploadMiddleware,
  addImagesHandler,
);

// DELETE /api/v1/properties/:id/images/:publicId
router.delete("/:id/images/:publicId", deleteImageHandler);

// PATCH /api/v1/properties/:id/images/:publicId/primary
router.patch("/:id/images/:publicId/primary", setPrimaryImageHandler);

// =============================================
// ADMIN ONLY ROUTES
// =============================================

// PATCH /api/v1/properties/:id/featured
router.patch("/:id/featured", allowOnly("admin"), toggleFeaturedHandler);

// PATCH /api/v1/properties/:id/status
router.patch(
  "/:id/status",
  allowOnly("admin"),
  validate(propertyStatusSchema),
  changeStatusHandler,
);

export default router;
