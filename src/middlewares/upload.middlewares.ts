import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadAvatar, uploadPropertyImage } from "../utils/cloudinary";

// =============================================
// AVATAR Upload Middleware
// =============================================
export const avatarUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  uploadAvatar.single("avatar")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            success: false,
            message: "Image is too large. Maximum size is 2MB",
          });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({
        success: false,
        message: err.message || "Image upload failed. Please try again.",
      });
      return;
    }
    next();
  });
};

// =============================================
// PROPERTY IMAGES Upload Middleware
// BUG FIX: max 6 images (was 10 before)
// =============================================
export const propertyImagesUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Max 6 per upload request — service layer enforces total max 6
  uploadPropertyImage.array("images", 6)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            success: false,
            message: "Image is too large. Maximum size is 5MB per image",
          });
          return;
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          res.status(400).json({
            success: false,
            message: "You can upload at most 6 images at once",
          });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({
        success: false,
        message: err.message || "Image upload failed. Please try again.",
      });
      return;
    }
    next();
  });
};