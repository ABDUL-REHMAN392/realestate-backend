import { Router } from "express";
import {
  toggleFavoriteHandler,
  getFavoritesHandler,
  checkFavoriteHandler,
  removeFavoriteHandler,
} from "../controllers/favorite.controllers";
import { protect } from "../middlewares/auth.middlewares";

const router = Router();

router.use(protect);

// GET    /api/v1/favorites                    — my saved properties
router.get("/", getFavoritesHandler);

// POST   /api/v1/favorites/:propertyId        — toggle save/unsave
router.post("/:propertyId", toggleFavoriteHandler);

// GET    /api/v1/favorites/:propertyId/check  — is it saved?
router.get("/:propertyId/check", checkFavoriteHandler);

// DELETE /api/v1/favorites/:propertyId        — remove from favorites
router.delete("/:propertyId", removeFavoriteHandler);

export default router;
