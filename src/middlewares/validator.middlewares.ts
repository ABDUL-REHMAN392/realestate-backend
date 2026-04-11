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
  type: z
    .enum(["house", "apartment", "plot", "commercial", "villa"])
    .optional(),
  purpose: z.enum(["sale", "rent"]).optional(),
  price: z.number().min(0).optional(),
  area: z.number().min(1).optional(),
  areaUnit: z.enum(["sqft", "sqm", "marla", "kanal"]).optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
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
