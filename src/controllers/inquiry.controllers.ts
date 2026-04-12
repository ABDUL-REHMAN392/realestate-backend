import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import {
  sendInquiry,
  getMySentInquiries,
  getReceivedInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
} from "../services/inquiry.services";

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
const toNum = (v: unknown, def: number): number => {
  const n = Number(v);
  return v !== undefined && v !== "" && !isNaN(n) ? n : def;
};

// =============================================
// POST /api/v1/inquiries
// Buyer sends inquiry about a property
// =============================================
export const sendInquiryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { propertyId, message, phone } = req.body as {
      propertyId: string;
      message: string;
      phone?: string;
    };

    const inquiry = await sendInquiry(
      propertyId,
      req.user!._id.toString(),
      message,
      phone,
    );

    sendSuccess(res, inquiry, "Inquiry sent successfully", 201);
  },
);

// =============================================
// GET /api/v1/inquiries/sent
// Buyer — my sent inquiries
// =============================================
export const getSentInquiriesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = toNum(req.query.page, 1);
    const limit = toNum(req.query.limit, 10);
    const result = await getMySentInquiries(
      req.user!._id.toString(),
      page,
      limit,
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET /api/v1/inquiries/received
// Agent — inquiries I received
// =============================================
export const getReceivedInquiriesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const page = toNum(req.query.page, 1);
    const limit = toNum(req.query.limit, 10);
    const status = req.query.status as string | undefined;
    const result = await getReceivedInquiries(
      req.user!._id.toString(),
      status,
      page,
      limit,
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET /api/v1/inquiries/:id
// View single inquiry
// =============================================
export const getInquiryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const inquiry = await getInquiryById(
      p(req.params.id),
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, inquiry, "Inquiry retrieved");
  },
);

// =============================================
// PATCH /api/v1/inquiries/:id/status
// Agent updates inquiry status
// =============================================
export const updateStatusHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const inquiry = await updateInquiryStatus(
      p(req.params.id),
      req.user!._id.toString(),
      req.user!.role,
      req.body.status,
    );
    sendSuccess(res, inquiry, `Inquiry status updated to '${inquiry.status}'`);
  },
);

// =============================================
// DELETE /api/v1/inquiries/:id
// Sender or admin deletes inquiry
// =============================================
export const deleteInquiryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await deleteInquiry(
      p(req.params.id),
      req.user!._id.toString(),
      req.user!.role,
    );
    sendSuccess(res, null, "Inquiry deleted successfully");
  },
);
