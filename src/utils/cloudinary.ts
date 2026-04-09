import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// =============================================
// Cloudinary Configuration
// =============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =============================================
// Startup Validation + Debug Log
// =============================================
const cfg = cloudinary.config();
console.log("☁️  Cloudinary config check:");
console.log(
  "   cloud_name :",
  cfg.cloud_name ? `✅ "${cfg.cloud_name}"` : "❌ MISSING",
);
console.log("   api_key    :", cfg.api_key ? "✅ set" : "❌ MISSING");
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
    folder: "realestate/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", quality: "auto" },
    ],
  },
});

// =============================================
// File Filter — images only
// =============================================
const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, or WebP images are allowed"));
  }
};

// =============================================
// Multer Instances
// =============================================
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
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
