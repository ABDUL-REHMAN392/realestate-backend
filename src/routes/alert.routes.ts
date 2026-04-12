import { Router } from "express";
import {
  createAlertHandler,
  getAlertsHandler,
  updateAlertHandler,
  deleteAlertHandler,
} from "../controllers/alert.controllers";
import { protect } from "../middlewares/auth.middlewares";
import {
  validate,
  createPriceAlertSchema,
  updatePriceAlertSchema,
} from "../middlewares/validator.middlewares";

const router = Router();

router.use(protect);

// GET    /api/v1/alerts        — my price alerts
router.get("/", getAlertsHandler);

// POST   /api/v1/alerts        — create alert
router.post("/", validate(createPriceAlertSchema), createAlertHandler);

// PATCH  /api/v1/alerts/:id    — update alert
router.patch("/:id", validate(updatePriceAlertSchema), updateAlertHandler);

// DELETE /api/v1/alerts/:id    — delete alert
router.delete("/:id", deleteAlertHandler);

export default router;
