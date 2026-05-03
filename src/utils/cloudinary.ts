import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// =============================================
// Cloudinary Configuration
// =============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cfg = cloudinary.config();
console.log("☁️  Cloudinary config check:");
console.log("   cloud_name :", cfg.cloud_name ? `✅ "${cfg.cloud_name}"` : "❌ MISSING");
console.log("   api_key    :", cfg.api_key    ? "✅ set" : "❌ MISSING");
console.log("   api_secret :", cfg.api_secret ? "✅ set" : "❌ MISSING");

if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
  console.error("\n❌ Cloudinary credentials missing! Check your .env file.\n");
  process.exit(1);
}

// =============================================
// AVATAR Storage — realestate/avatars
// =============================================
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    // @ts-expect-error: multer-storage-cloudinary types are loose
    folder:           "realestate/avatars",
    allowed_formats:  ["jpg", "jpeg", "png", "webp"],
    transformation:   [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  },
});

// =============================================
// PROPERTY IMAGE Storage — realestate/properties
// =============================================
const propertyImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    // @ts-expect-error: multer-storage-cloudinary types are loose
    folder:          "realestate/properties",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1280, height: 960, crop: "limit", quality: "auto:good" }],
  },
});

// =============================================
// AGENT DOCS Storage — realestate/agent-docs
// Passport photo, CNIC front/back, Utility bill
// =============================================
const agentDocStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    // @ts-expect-error: multer-storage-cloudinary types are loose
    folder:          "realestate/agent-docs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1600, height: 1200, crop: "limit", quality: "auto:best" }],
  },
});

// =============================================
// CHAT FILE Storage — realestate/chat-files
// Images + PDF + Word documents
// resource_type: auto handles both images and raw files
// =============================================
const chatFileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    // @ts-expect-error: multer-storage-cloudinary types are loose
    folder:        "realestate/chat-files",
    resource_type: "auto",
  },
});

// =============================================
// File Filters
// =============================================
const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, or WebP images are allowed"));
  }
};

const chatFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/webp", "image/jpg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images, PDF, and Word documents are allowed in chat"));
  }
};

// =============================================
// Multer Instances
// =============================================
export const uploadAvatar = multer({
  storage:    avatarStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export const uploadPropertyImage = multer({
  storage:    propertyImageStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadAgentDocs = multer({
  storage:    agentDocStorage,
  fileFilter: imageFilter,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadChatFile = multer({
  storage:    chatFileStorage,
  fileFilter: chatFileFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// =============================================
// Delete from Cloudinary
// =============================================
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Cloudinary delete result for "${publicId}":`, result);
  } catch (err) {
    console.error(`⚠️  Cloudinary delete failed for "${publicId}":`, err);
  }
};

export default cloudinary;