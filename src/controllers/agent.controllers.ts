import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../utils/errorHandler";
import { sendSuccess, sendPaginated } from "../utils/apiResponse";
import { AuthRequest } from "../types";
import * as agentService from "../services/agent.services";

// Helper — Express 5: params can be string | string[]
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// Helper — extract Cloudinary info from uploaded file
type MulterFiles = { [fieldname: string]: Express.Multer.File[] };

const extractCloudinaryFile = (
  files: MulterFiles,
  fieldName: string,
): { url: string; publicId: string } | null => {
  const fileArr = files[fieldName];
  if (!fileArr || fileArr.length === 0) return null;
  const file = fileArr[0] as Express.Multer.File & { path: string; filename: string };
  return { url: file.path, publicId: file.filename };
};

// =============================================
// CHECK MY APPLICATION STATUS
// GET /api/v1/agents/application/status
// Protected — any logged-in user
// Returns null if no application, else { applicationStatus, licenseNumber?, rejectionReason? }
// =============================================
export const getApplicationStatus = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const status = await agentService.getApplicationStatus(String(req.user!._id));
    sendSuccess(res, { applicationStatus: status }, "Application status retrieved");
  },
);

// =============================================
// CREATE / RE-APPLY AGENT PROFILE
// POST /api/v1/agents/profile
// Protected — any logged-in buyer
// Files (multipart): passportPhoto, cnicFront, cnicBack, utilityBill
// =============================================
export const createProfile = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const files = (req.files as MulterFiles) ?? {};

    const passportFile  = extractCloudinaryFile(files, "passportPhoto");
    const cnicFrontFile = extractCloudinaryFile(files, "cnicFront");
    const cnicBackFile  = extractCloudinaryFile(files, "cnicBack");
    const billFile      = extractCloudinaryFile(files, "utilityBill");

    const agent = await agentService.createAgentProfile(String(req.user!._id), {
      bio:         req.body.bio,
      experience:  Number(req.body.experience),
      agencyName:  req.body.agencyName,
      city:        req.body.city,
      specializations: req.body.specializations
        ? JSON.parse(req.body.specializations)
        : [],
      languages: req.body.languages
        ? JSON.parse(req.body.languages)
        : ["English"],
      whatsapp: req.body.whatsapp,
      website:  req.body.website,

      passportPhoto:         passportFile?.url,
      passportPhotoPublicId: passportFile?.publicId,
      cnicFront:             cnicFrontFile?.url,
      cnicFrontPublicId:     cnicFrontFile?.publicId,
      cnicBack:              cnicBackFile?.url,
      cnicBackPublicId:      cnicBackFile?.publicId,
      utilityBill:           billFile?.url,
      utilityBillPublicId:   billFile?.publicId,
    });

    sendSuccess(
      res,
      { agent },
      "Application submitted successfully. Waiting for admin review.",
      201,
    );
  },
);

// =============================================
// GET MY AGENT PROFILE
// GET /api/v1/agents/profile/me
// Protected — any logged-in user (buyer can also check their own application)
// =============================================
export const getMyProfile = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.getMyAgentProfile(String(req.user!._id));
    sendSuccess(res, { agent }, "Agent profile retrieved successfully");
  },
);

// =============================================
// UPDATE MY AGENT PROFILE
// PATCH /api/v1/agents/profile/me
// Protected — role=agent (approved only)
// =============================================
export const updateMyProfile = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
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
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
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
// =============================================
export const getAllAgents = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const result = await agentService.getAllAgents({
      city:           req.query.city as string | undefined,
      language:       req.query.language as string | undefined,
      specialization: req.query.specialization as string | undefined,
      isVerified:     req.query.isVerified !== undefined
        ? req.query.isVerified === "true"
        : undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      sortBy:    req.query.sortBy as agentService.AgentFilters["sortBy"],
      page:      req.query.page  ? Number(req.query.page)  : 1,
      limit:     req.query.limit ? Number(req.query.limit) : 12,
    });

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET AGENT BY PROFILE ID — public
// GET /api/v1/agents/:agentId
// =============================================
export const getAgentById = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.getAgentById(p(req.params.agentId));
    sendSuccess(res, { agent }, "Agent retrieved successfully");
  },
);

// =============================================
// GET AGENT BY USER ID — public
// GET /api/v1/agents/user/:userId
// =============================================
export const getAgentByUserId = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.getAgentByUserId(p(req.params.userId));
    sendSuccess(res, { agent }, "Agent profile retrieved successfully");
  },
);

// =============================================
// GET AGENT LISTINGS — public
// GET /api/v1/agents/:agentId/listings
// =============================================
export const getAgentListings = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.getAgentById(p(req.params.agentId));
    const page  = req.query.page  ? Number(req.query.page)  : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await agentService.getAgentListings(
      String((agent.user as unknown as { _id: string })._id ?? agent.user),
      page,
      limit,
    );

    sendSuccess(
      res,
      { data: result.data, total: result.total, totalPages: result.totalPages, page, limit },
      "Agent listings retrieved successfully",
    );
  },
);

// =============================================
// VERIFY / REJECT AGENT — Admin only
// PATCH /api/v1/agents/:agentId/verify
// Body: { isVerified: boolean, rejectionReason?: string }
// =============================================
export const verifyAgent = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const agent = await agentService.verifyAgent(
      p(req.params.agentId),
      req.body.isVerified as boolean,
      req.body.rejectionReason as string | undefined,
    );

    sendSuccess(
      res,
      { agent },
      agent.isVerified ? "Agent verified successfully" : "Agent application rejected",
    );
  },
);

// =============================================
// GET ALL APPLICATIONS — Admin only
// GET /api/v1/agents/applications?status=pending&page=1&limit=20
// =============================================
export const getAllApplications = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const result = await agentService.getAllApplications({
      status: req.query.status as "pending" | "approved" | "rejected" | undefined,
      page:   req.query.page  ? Number(req.query.page)  : 1,
      limit:  req.query.limit ? Number(req.query.limit) : 20,
    });

    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// DELETE AGENT PROFILE — Admin only
// DELETE /api/v1/agents/:agentId
// =============================================
export const deleteAgentById = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    await agentService.deleteAgentProfile(
      p(req.params.agentId),
      String(req.user!._id),
      req.user!.role,
    );
    sendSuccess(res, null, "Agent profile deleted successfully");
  },
);

// =============================================
// ADD REVIEW
// POST /api/v1/agents/:agentId/reviews
// =============================================
export const addReview = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const agent  = await agentService.getAgentById(p(req.params.agentId));
    const review = await agentService.addReview(
      String((agent.user as unknown as { _id: string })._id ?? agent.user),
      String(req.user!._id),
      req.body,
    );
    sendSuccess(res, { review }, "Review added successfully", 201);
  },
);

// =============================================
// UPDATE REVIEW
// PATCH /api/v1/agents/reviews/:reviewId
// =============================================
export const updateReview = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
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
// =============================================
export const deleteReview = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    await agentService.deleteReview(
      p(req.params.reviewId),
      String(req.user!._id),
      req.user!.role,
    );
    sendSuccess(res, null, "Review deleted successfully");
  },
);

// =============================================
// GET AGENT REVIEWS — public
// GET /api/v1/agents/:agentId/reviews
// =============================================
export const getAgentReviews = catchAsync(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const agent  = await agentService.getAgentById(p(req.params.agentId));
    const result = await agentService.getAgentReviews(
      String((agent.user as unknown as { _id: string })._id ?? agent.user),
      {
        page:  req.query.page  ? Number(req.query.page)  : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
      },
    );
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  },
);

// =============================================
// GET AGENT ANALYTICS
// GET /api/v1/agents/analytics/me
// Protected — role = agent
// =============================================
export const getMyAnalytics = catchAsync(
  async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
    const analytics = await agentService.getAgentAnalytics(String(req.user!._id));
    sendSuccess(res, analytics, "Analytics retrieved successfully");
  },
);
