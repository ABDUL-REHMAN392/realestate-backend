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

router.use(protect);

// POST   /api/v1/inquiries             — send inquiry
router.post("/", validate(sendInquirySchema), sendInquiryHandler);

// GET    /api/v1/inquiries/sent        — my sent inquiries (buyer)
router.get("/sent", getSentInquiriesHandler);

// GET    /api/v1/inquiries/received    — received inquiries (agent)
router.get(
  "/received",
  allowOnly("agent", "admin"),
  getReceivedInquiriesHandler,
);

// GET    /api/v1/inquiries/:id
router.get("/:id", getInquiryHandler);

// PATCH  /api/v1/inquiries/:id/status  — agent updates status
router.patch(
  "/:id/status",
  allowOnly("agent", "admin"),
  validate(inquiryStatusSchema),
  updateStatusHandler,
);

// DELETE /api/v1/inquiries/:id
router.delete("/:id", deleteInquiryHandler);

export default router;
