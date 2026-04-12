import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import {
  createPriceAlert,
  getMyAlerts,
  updatePriceAlert,
  deletePriceAlert,
} from "../services/alert.services";
import { IPriceAlert } from "../models/alert.models";

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
const toNum = (v: unknown, def: number): number => {
  const n = Number(v);
  return v !== undefined && v !== "" && !isNaN(n) ? n : def;
};

export const createAlertHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const alert = await createPriceAlert(req.user!._id.toString(), req.body);
    sendSuccess(res, alert, "Price alert created successfully", 201);
  },
);

export const getAlertsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getMyAlerts(
      req.user!._id.toString(),
      toNum(req.query.page, 1),
      toNum(req.query.limit, 10),
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

export const updateAlertHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const alert = await updatePriceAlert(
      p(req.params.id),
      req.user!._id.toString(),
      req.body as Partial<IPriceAlert>,
    );
    sendSuccess(res, alert, "Price alert updated");
  },
);

export const deleteAlertHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await deletePriceAlert(p(req.params.id), req.user!._id.toString());
    sendSuccess(res, null, "Price alert deleted");
  },
);
