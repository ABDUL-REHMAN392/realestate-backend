import { Response } from "express";
import { AuthRequest } from "../types";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import {
  toggleFavorite,
  getMyFavorites,
  isFavorited,
  removeFavorite,
} from "../services/favorite.services";

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
const toNum = (v: unknown, def: number): number => {
  const n = Number(v);
  return v !== undefined && v !== "" && !isNaN(n) ? n : def;
};

export const toggleFavoriteHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { added, favorite } = await toggleFavorite(
      req.user!._id.toString(),
      p(req.params.propertyId),
    );
    sendSuccess(
      res,
      { added, favorite },
      added ? "Property saved to favorites" : "Property removed from favorites",
    );
  },
);

export const getFavoritesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getMyFavorites(
      req.user!._id.toString(),
      toNum(req.query.page, 1),
      toNum(req.query.limit, 10),
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

export const checkFavoriteHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const saved = await isFavorited(
      req.user!._id.toString(),
      p(req.params.propertyId),
    );
    sendSuccess(res, { isFavorited: saved }, "Favorite status");
  },
);

export const removeFavoriteHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await removeFavorite(req.user!._id.toString(), p(req.params.propertyId));
    sendSuccess(res, null, "Property removed from favorites");
  },
);
