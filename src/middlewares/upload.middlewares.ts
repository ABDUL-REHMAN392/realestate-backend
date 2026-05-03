import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadAvatar, uploadPropertyImage, uploadAgentDocs, uploadChatFile } from "../utils/cloudinary";

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
          res.status(400).json({ success: false, message: "Image is too large. Maximum size is 2MB" });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ success: false, message: err.message || "Image upload failed. Please try again." });
      return;
    }
    next();
  });
};

// =============================================
// PROPERTY IMAGES Upload Middleware
// =============================================
export const propertyImagesUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  uploadPropertyImage.array("images", 6)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ success: false, message: "Image is too large. Maximum size is 5MB per image" });
          return;
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          res.status(400).json({ success: false, message: "You can upload at most 6 images at once" });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ success: false, message: err.message || "Image upload failed. Please try again." });
      return;
    }
    next();
  });
};

// =============================================
// AGENT DOCUMENTS Upload Middleware
// passportPhoto, cnicFront, cnicBack, utilityBill
// =============================================
export const agentDocsUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const upload = uploadAgentDocs.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "cnicFront",     maxCount: 1 },
    { name: "cnicBack",      maxCount: 1 },
    { name: "utilityBill",   maxCount: 1 },
  ]);

  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ success: false, message: "Document image is too large. Maximum size is 5MB" });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ success: false, message: err.message || "Document upload failed." });
      return;
    }
    next();
  });
};

// =============================================
// CHAT FILE Upload Middleware
// Images + PDF + Word docs — max 10MB
// =============================================
export const chatFileUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  uploadChatFile.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ success: false, message: "File is too large. Maximum size is 10MB" });
          return;
        }
        res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        return;
      }
      res.status(400).json({ success: false, message: err.message || "File upload failed." });
      return;
    }
    next();
  });
};