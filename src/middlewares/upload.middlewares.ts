import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadAvatar } from "../utils/cloudinary";

// =============================================
// AVATAR Upload Middleware
// POST /api/v1/users/me/avatar
// Field name: 'avatar'
// =============================================
export const avatarUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  uploadAvatar.single("avatar")(req, res, (err) => {
    if (err) {
      console.error("🔴 Multer/Cloudinary upload error:", err);

      // Multer-specific errors (file size, file type)
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({
            success: false,
            message: "Image is too large. Maximum size is 2MB",
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
        return;
      }

      // Cloudinary or other errors
      res.status(400).json({
        success: false,
        message: err.message || "Image upload failed. Please try again.",
      });
      return;
    }
    next();
  });
};
