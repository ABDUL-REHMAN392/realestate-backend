import { Router } from "express";
import {
  sendInquiryHandler,
  getSentInquiriesHandler,
  getReceivedInquiriesHandler,
  getInquiryHandler,
  updateStatusHandler,
  deleteInquiryHandler,
} from "../controllers/inquiry.controllers";
import { protect, allowOnly } from "../middlewares/auth.middlewares";
import {
  validate,
  sendInquirySchema,
  inquiryStatusSchema,
} from "../middlewares/validator.middlewares";

const router = Router();

// All inquiry routes require authentication
router.use(protect);

// =============================================
// POST /api/v1/inquiries
// Any logged-in user can send inquiry (buyer typically)
// =============================================
router.post("/", validate(sendInquirySchema), sendInquiryHandler);

// =============================================
// GET /api/v1/inquiries/sent
// Buyer — see inquiries I sent
// =============================================
router.get("/sent", getSentInquiriesHandler);

// =============================================
// GET /api/v1/inquiries/received
// Agent — see inquiries I received
// ?status=pending|replied|closed
// =============================================
router.get(
  "/received",
  allowOnly("agent", "admin"),
  getReceivedInquiriesHandler,
);

// =============================================
// GET /api/v1/inquiries/:id
// =============================================
router.get("/:id", getInquiryHandler);

// =============================================
// PATCH /api/v1/inquiries/:id/status
// Agent or admin updates status
// =============================================
router.patch(
  "/:id/status",
  allowOnly("agent", "admin"),
  validate(inquiryStatusSchema),
  updateStatusHandler,
);

// =============================================
// DELETE /api/v1/inquiries/:id
// =============================================
router.delete("/:id", deleteInquiryHandler);

export default router;
