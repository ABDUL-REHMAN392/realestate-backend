import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import { AuthRequest } from "../types";
import * as agentService from "../services/agent.services";

// Helper — Express 5: params can be string | string[]
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// =============================================
// CREATE MY AGENT PROFILE
// POST /api/v1/agents/profile
// Protected — role=agent only
// =============================================
export const createProfile = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const agent = await agentService.createAgentProfile(
      String(req.user!._id),
      req.body,
    );
    sendSuccess(
      res,
      { agent },
      "Agent profile created. Waiting for admin approval.",
      201,
    );
  },
);

// =============================================
// GET MY AGENT PROFILE
// GET /api/v1/agents/profile/me
// Protected — role=agent
// =============================================
export const getMyProfile = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const agent = await agentService.getMyAgentProfile(String(req.user!._id));
    sendSuccess(res, { agent }, "Agent profile retrieved successfully");
  },
);

// =============================================
// UPDATE MY AGENT PROFILE
// PATCH /api/v1/agents/profile/me
// Protected — role=agent
// =============================================
export const updateMyProfile = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const agent = await agentService.updateAgentProfile(
      String(req.user!._id),
      req.body,
    );
    sendSuccess(res, { agent }, "Agent profile updated successfully");
  },
);

// =============================================
// DELETE MY AGENT PROFILE
// DELETE /api/v1/agents/profile/me
// Protected — role=agent or admin
// =============================================
export const deleteMyProfile = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    // For self-deletion, agentId is the profile of the current user
    const agent = await agentService.getMyAgentProfile(String(req.user!._id));
    await agentService.deleteAgentProfile(
      String(agent._id),
      String(req.user!._id),
      req.user!.role,
    );
    sendSuccess(res, null, "Agent profile deleted successfully");
  },
);

// =============================================
// GET ALL AGENTS — public directory
// GET /api/v1/agents
// Query: city, language, specialization, isVerified, minRating, sortBy, page, limit
// =============================================
export const getAllAgents = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const result = await agentService.getAllAgents({
      city: req.query.city as string | undefined,
      language: req.query.language as string | undefined,
      specialization: req.query.specialization as string | undefined,
      isVerified:
        req.query.isVerified !== undefined
          ? req.query.isVerified === "true"
          : undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      sortBy: req.query.sortBy as agentService.AgentFilters["sortBy"],
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 12,
    });

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET AGENT PROFILE BY ID
// GET /api/v1/agents/:agentId
// Public
// =============================================
export const getAgentById = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.getAgentById(p(req.params.agentId));
    sendSuccess(res, { agent }, "Agent retrieved successfully");
  },
);

// =============================================
// GET AGENT BY USER ID
// GET /api/v1/agents/user/:userId
// Public — when buyer clicks agent name from property
// =============================================
export const getAgentByUserId = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.getAgentByUserId(p(req.params.userId));
    sendSuccess(res, { agent }, "Agent profile retrieved successfully");
  },
);

// =============================================
// GET AGENT LISTINGS
// GET /api/v1/agents/:agentId/listings
// Public — properties posted by this agent
// =============================================
export const getAgentListings = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // First get agent profile to get user._id
    const agent = await agentService.getAgentById(p(req.params.agentId));

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await agentService.getAgentListings(
      String(agent.user),
      page,
      limit,
    );

    sendSuccess(
      res,
      {
        data: result.data,
        total: result.total,
        totalPages: result.totalPages,
        page,
        limit,
      },
      "Agent listings retrieved successfully",
    );
  },
);

// =============================================
// VERIFY AGENT — Admin only
// PATCH /api/v1/agents/:agentId/verify
// Body: { isVerified: boolean }
// =============================================
export const verifyAgent = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const agent = await agentService.verifyAgent(
      p(req.params.agentId),
      req.body.isVerified as boolean,
    );

    sendSuccess(
      res,
      { agent },
      agent.isVerified
        ? "Agent verified successfully"
        : "Agent verification removed",
    );
  },
);

// =============================================
// DELETE AGENT PROFILE — Admin only
// DELETE /api/v1/agents/:agentId
// =============================================
export const deleteAgentById = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    await agentService.deleteAgentProfile(
      p(req.params.agentId),
      String(req.user!._id),
      req.user!.role,
    );
    sendSuccess(res, null, "Agent profile deleted successfully");
  },
);

// =============================================
// ADD REVIEW FOR AN AGENT
// POST /api/v1/agents/:agentId/reviews
// Protected — any logged-in user (buyer)
// Body: { rating, comment }
// =============================================
export const addReview = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    // agentId here is the Agent profile _id
    const agent = await agentService.getAgentById(p(req.params.agentId));

    const review = await agentService.addReview(
      String(agent.user), // agent's user._id
      String(req.user!._id), // reviewer's user._id
      req.body,
    );

    sendSuccess(res, { review }, "Review added successfully", 201);
  },
);

// =============================================
// UPDATE MY REVIEW
// PATCH /api/v1/agents/reviews/:reviewId
// Protected — only reviewer
// =============================================
export const updateReview = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    const review = await agentService.updateMyReview(
      p(req.params.reviewId),
      String(req.user!._id),
      req.body,
    );
    sendSuccess(res, { review }, "Review updated successfully");
  },
);

// =============================================
// DELETE REVIEW
// DELETE /api/v1/agents/reviews/:reviewId
// Protected — reviewer or admin
// =============================================
export const deleteReview = catchAsync(
  async (
    req: AuthRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> => {
    await agentService.deleteReview(
      p(req.params.reviewId),
      String(req.user!._id),
      req.user!.role,
    );
    sendSuccess(res, null, "Review deleted successfully");
  },
);

// =============================================
// GET AGENT REVIEWS
// GET /api/v1/agents/:agentId/reviews
// Public
// =============================================
export const getAgentReviews = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // agentId = agent profile _id
    const agent = await agentService.getAgentById(p(req.params.agentId));

    const result = await agentService.getAgentReviews(String(agent.user), {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);
