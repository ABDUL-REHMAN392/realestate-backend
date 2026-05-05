import { Router } from "express";

import {
  createProfile, getMyProfile, updateMyProfile, deleteMyProfile,
  getAllAgents, getAgentById, getAgentByUserId, getAgentListings,
  verifyAgent, deleteAgentById, getAllApplications,
  addReview, updateReview, deleteReview, getAgentReviews,
  getApplicationStatus, getMyAnalytics,
} from "../controllers/agent.controllers";

import { protect, allowOnly } from "../middlewares/auth.middlewares";
import {
  validate,
  updateAgentProfileSchema,
  createReviewSchema,
  verifyAgentSchema,
} from "../middlewares/validator.middlewares";
import { agentDocsUploadMiddleware } from "../middlewares/upload.middlewares";

const router = Router();

// =============================================
// PUBLIC ROUTES
// =============================================
router.get("/",                        getAllAgents);
router.get("/user/:userId",            getAgentByUserId);
router.get("/:agentId/listings",       getAgentListings);   // ✅ public
router.get("/:agentId/reviews",        getAgentReviews);    // ✅ public
router.get("/:agentId",                getAgentById);       // ✅ public 
// =============================================
// PROTECTED ROUTES 
// =============================================
router.use(protect);

router.get("/application/status",      getApplicationStatus);
router.get("/analytics/me",            allowOnly("agent", "admin"), getMyAnalytics);
router.get("/profile/me",              getMyProfile);
router.post("/profile",                agentDocsUploadMiddleware, createProfile);
router.patch("/profile/me",            allowOnly("agent", "admin"), validate(updateAgentProfileSchema), updateMyProfile);
router.delete("/profile/me",           allowOnly("agent", "admin"), deleteMyProfile);

router.patch("/reviews/:reviewId",     validate(createReviewSchema), updateReview);
router.delete("/reviews/:reviewId",    deleteReview);


router.post("/:agentId/reviews",       validate(createReviewSchema), addReview);

// Admin only
router.get("/applications",            allowOnly("admin"), getAllApplications);
router.patch("/:agentId/verify",       allowOnly("admin"), validate(verifyAgentSchema), verifyAgent);
router.delete("/:agentId",             allowOnly("admin"), deleteAgentById);

export default router;