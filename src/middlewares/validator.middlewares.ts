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
