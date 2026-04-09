import { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200,
): void => {
  res.status(statusCode).json({ success: true, message, data });
};

export const sendPaginated = (
  res: Response,
  data: unknown,
  total: number,
  page: number,
  limit: number,
): void => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};
