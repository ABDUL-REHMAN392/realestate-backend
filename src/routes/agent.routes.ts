import { Router } from "express";

import {
  createProfile,
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
  getAllAgents,
  getAgentById,
  getAgentByUserId,
  getAgentListings,
  verifyAgent,
  deleteAgentById,
  addReview,
  updateReview,
  deleteReview,
  getAgentReviews,
} from "../controllers/agent.controllers";

import { protect, allowOnly } from "../middlewares/auth.middlewares";
import {
  validate,
  createAgentProfileSchema,
  updateAgentProfileSchema,
  createReviewSchema,
  verifyAgentSchema,
} from "../middlewares/validator.middlewares";

const router = Router();

// =============================================
// PUBLIC Routes — No login required
// =============================================

// GET /api/v1/agents — agent directory
// Query: city, language, specialization, isVerified, minRating, sortBy, page, limit
router.get("/", getAllAgents);

// GET /api/v1/agents/user/:userId — by user ID (from property page)
router.get("/user/:userId", getAgentByUserId);

// GET /api/v1/agents/:agentId — by agent profile ID
router.get("/:agentId", getAgentById);

// GET /api/v1/agents/:agentId/listings — agent's properties
router.get("/:agentId/listings", getAgentListings);

// GET /api/v1/agents/:agentId/reviews — agent's reviews
router.get("/:agentId/reviews", getAgentReviews);

// =============================================
// PROTECTED Routes — Login required
// =============================================
router.use(protect);

// =============================================
// MY AGENT PROFILE — role=agent
// =============================================

// POST /api/v1/agents/profile — create profile
router.post(
  "/profile",
  allowOnly("agent"),
  validate(createAgentProfileSchema),
  createProfile,
);

// GET /api/v1/agents/profile/me — view my profile
router.get("/profile/me", allowOnly("agent"), getMyProfile);

// PATCH /api/v1/agents/profile/me — update my profile
router.patch(
  "/profile/me",
  allowOnly("agent"),
  validate(updateAgentProfileSchema),
  updateMyProfile,
);

// DELETE /api/v1/agents/profile/me — delete my profile
router.delete("/profile/me", allowOnly("agent"), deleteMyProfile);

// =============================================
// REVIEWS — any logged-in user can review
// =============================================

// POST /api/v1/agents/:agentId/reviews — add review
router.post("/:agentId/reviews", validate(createReviewSchema), addReview);

// PATCH /api/v1/agents/reviews/:reviewId — update own review
router.patch("/reviews/:reviewId", validate(createReviewSchema), updateReview);

// DELETE /api/v1/agents/reviews/:reviewId — delete own review or admin
router.delete("/reviews/:reviewId", deleteReview);

// =============================================
// ADMIN Only Routes
// =============================================

// PATCH /api/v1/agents/:agentId/verify — approve/reject agent
router.patch(
  "/:agentId/verify",
  allowOnly("admin"),
  validate(verifyAgentSchema),
  verifyAgent,
);

// DELETE /api/v1/agents/:agentId — delete any agent profile
router.delete("/:agentId", allowOnly("admin"), deleteAgentById);

export default router;
