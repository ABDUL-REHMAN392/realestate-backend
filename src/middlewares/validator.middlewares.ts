import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// =============================================
// Validation Middleware Factory
// =============================================
export const validate =
  (schema: z.ZodType) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };

// =============================================
// Phone — international format
// Accepts: +923001234567, +14155552671, +447911123456 etc.
// E.164 format: + followed by 7-15 digits
// =============================================
const phoneSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{6,14}$/,
    "Please enter a valid phone number in international format (e.g. +923001234567)",
  )
  .optional();

// =============================================
// AUTH Schemas
// =============================================
export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string({ error: "Email is required" })
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  phone: phoneSchema,

  role: z.enum(["buyer", "agent"]).default("buyer"),
});

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .email("Please enter a valid email")
    .toLowerCase()
    .trim(),
  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "Current password is required" }).min(1),
    newPassword: z
      .string({ error: "New password is required" })
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// =============================================
// User Update Schema
// =============================================
export const updateMeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  phone: phoneSchema,
});
// =============================================
// PROPERTY Schemas
// =============================================
const coordinatesSchema = z
  .tuple([
    z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
    z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  ])
  .describe("[longitude, latitude]");
 
const addressSchema = z.object({
  street: z.string().trim().optional(),
  city: z
    .string({ error: "City is required" })
    .trim()
    .min(1, "City is required"),
  state: z
    .string({ error: "State/Province is required" })
    .trim()
    .min(1, "State is required"),
  country: z
    .string({ error: "Country is required" })
    .trim()
    .min(1, "Country is required"),
  postalCode: z.string().trim().optional(),
});
 
export const createPropertySchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title cannot exceed 150 characters"),
 
  description: z
    .string({ error: "Description is required" })
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(3000, "Description cannot exceed 3000 characters"),
 
  type: z.enum(["house", "apartment", "plot", "commercial", "villa"], {
    error: "Type must be: house, apartment, plot, commercial, or villa",
  }),
 
  purpose: z.enum(["sale", "rent"], {
    error: "Purpose must be 'sale' or 'rent'",
  }),
 
  price: z
    .number({ error: "Price is required and must be a number" })
    .min(0, "Price cannot be negative"),
 
  area: z
    .number({ error: "Area is required and must be a number" })
    .min(1, "Area must be at least 1"),
 
  areaUnit: z.enum(["sqft", "sqm", "marla", "kanal"]).default("sqft"),
 
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  floorNumber: z.number().int().min(0).optional(),
  totalFloors: z.number().int().min(1).optional(),
  yearBuilt: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 2)
    .optional(),
  parkingSpaces: z.number().int().min(0).optional(),
 
  features: z.array(z.string().trim()).max(30).default([]),
 
  address: addressSchema,
 
  location: z.object({
    type: z.literal("Point").default("Point"),
    coordinates: coordinatesSchema,
  }),
});
 
export const updatePropertySchema = z.object({
  title: z.string().trim().min(5).max(150).optional(),
  description: z.string().trim().min(20).max(3000).optional(),
  type: z.enum(["house", "apartment", "plot", "commercial", "villa"]).optional(),
  purpose: z.enum(["sale", "rent"]).optional(),
  price: z.number().min(0).optional(),
  area: z.number().min(1).optional(),
  areaUnit: z.enum(["sqft", "sqm", "marla", "kanal"]).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  floorNumber: z.number().int().min(0).optional(),
  totalFloors: z.number().int().min(1).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 2).optional(),
  parkingSpaces: z.number().int().min(0).optional(),
  features: z.array(z.string().trim()).max(30).optional(),
  address: addressSchema.partial().optional(),
  location: z
    .object({
      type: z.literal("Point").default("Point"),
      coordinates: coordinatesSchema,
    })
    .optional(),
});
 
export const propertyStatusSchema = z.object({
  status: z.enum(["active", "sold", "rented", "inactive"], {
    error: "Status must be: active, sold, rented, or inactive",
  }),
});
 
// =============================================
// AGENT Schemas
// =============================================

export const createAgentProfileSchema = z.object({
  bio: z
    .string({ error: "Bio is required" })
    .trim()
    .min(20, "Bio must be at least 20 characters")
    .max(1000, "Bio cannot exceed 1000 characters"),

  experience: z
    .number({ error: "Years of experience is required" })
    .int()
    .min(0, "Experience cannot be negative")
    .max(70, "Experience seems too high"),

  licenseNumber: z
    .string({ error: "License number is required" })
    .trim()
    .min(3, "License number must be at least 3 characters")
    .max(50, "License number is too long"),

  agencyName: z.string().trim().max(100).optional(),

  city: z
    .string({ error: "City is required" })
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100, "City is too long"),

  specializations: z
    .array(z.string().trim().min(1))
    .max(10, "Cannot exceed 10 specializations")
    .default([]),

  languages: z
    .array(z.string().trim().min(1))
    .max(10, "Cannot exceed 10 languages")
    .default(["English"]),

  whatsapp: z
    .string()
    .regex(
      /^\+[1-9]\d{6,14}$/,
      "Please enter a valid WhatsApp number in international format",
    )
    .optional(),

  website: z.string().url("Please enter a valid website URL").optional(),
});

export const updateAgentProfileSchema = z
  .object({
    bio: z.string().trim().min(20).max(1000).optional(),
    experience: z.number().int().min(0).max(70).optional(),
    agencyName: z.string().trim().max(100).optional(),
    city: z.string().trim().min(2).max(100).optional(),
    specializations: z.array(z.string().trim().min(1)).max(10).optional(),
    languages: z.array(z.string().trim().min(1)).max(10).optional(),
    whatsapp: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/)
      .optional(),
    website: z.string().url("Please enter a valid URL").optional(),
  })
  .refine(
    (d) => Object.keys(d).some((k) => d[k as keyof typeof d] !== undefined),
    { message: "Please provide at least one field to update" },
  );

export const createReviewSchema = z.object({
  rating: z
    .number({ error: "Rating is required" })
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),

  comment: z
    .string({ error: "Comment is required" })
    .trim()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment cannot exceed 1000 characters"),
});

export const verifyAgentSchema = z.object({
  isVerified: z.boolean({ error: "isVerified must be true or false" }),
});
// =============================================
// CHAT Schemas
// =============================================
export const startConversationSchema = z.object({
  userId: z
    .string({ error: "userId is required" })
    .min(1, "userId is required"),
  propertyId: z.string().optional(),
});

export const sendMessageSchema = z.object({
  text: z
    .string({ error: "Message text is required" })
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
});
export const editMessageSchema = z.object({
  text: z
    .string({ error: "Text is required" })
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
});
// =============================================
// INQUIRY Schemas
// =============================================
export const sendInquirySchema = z.object({
  propertyId: z
    .string({ error: "propertyId is required" })
    .min(1, "propertyId is required"),
  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message cannot exceed 1000 characters"),
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{6,14}$/,
      "Please enter a valid phone number (e.g. +923001234567)",
    )
    .optional(),
});

export const inquiryStatusSchema = z.object({
  status: z.enum(["pending", "replied", "closed"], {
    error: "Status must be: pending, replied, or closed",
  }),
});

// =============================================
// PRICE ALERT Schemas
// =============================================
export const createPriceAlertSchema = z.object({
  city: z
    .string({ error: "City is required" })
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100),
  purpose: z.enum(["sale", "rent"], {
    error: "Purpose must be 'sale' or 'rent'",
  }),
  type: z
    .enum(["house", "apartment", "plot", "commercial", "villa"])
    .optional(),
  maxPrice: z
    .number({ error: "maxPrice is required" })
    .min(1, "Max price must be greater than 0"),
  minBedrooms: z.number().int().min(0).optional(),
});

export const updatePriceAlertSchema = z
  .object({
    city: z.string().trim().min(2).max(100).optional(),
    purpose: z.enum(["sale", "rent"]).optional(),
    type: z
      .enum(["house", "apartment", "plot", "commercial", "villa"])
      .optional(),
    maxPrice: z.number().min(1).optional(),
    minBedrooms: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Please provide at least one field to update",
  });
