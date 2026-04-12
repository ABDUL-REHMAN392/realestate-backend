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

export const getSentInquiriesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getMySentInquiries(
      req.user!._id.toString(),
      toNum(req.query.page, 1),
      toNum(req.query.limit, 10),
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

export const getReceivedInquiriesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getReceivedInquiries(
      req.user!._id.toString(),
      req.query.status as string | undefined,
      toNum(req.query.page, 1),
      toNum(req.query.limit, 10),
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

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
