import mongoose from "mongoose";
import Agent, { IAgent } from "../models/agent.models";
import Review, { IReview } from "../models/review.models";
import Property from "../models/property.models";
import User from "../models/user.models";
import { AppError } from "../utils/errorHandler";
import { deleteFromCloudinary } from "../utils/cloudinary";
import { PaginationResult } from "../types";

// =============================================
// Filters Interface
// =============================================
export interface AgentFilters {
  city?: string;
  language?: string;
  specialization?: string;
  isVerified?: boolean;
  minRating?: number;
  page?: number;
  limit?: number;
  sortBy?: "rating" | "experience" | "listings" | "newest";
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
}

export interface CreateAgentProfileData {
  bio: string;
  experience: number;
  agencyName?: string;
  city: string;
  specializations?: string[];
  languages?: string[];
  whatsapp?: string;
  website?: string;
  // Document Cloudinary info — filled by controller after upload
  passportPhoto?:         string;
  passportPhotoPublicId?: string;
  cnicFront?:             string;
  cnicFrontPublicId?:     string;
  cnicBack?:              string;
  cnicBackPublicId?:      string;
  utilityBill?:           string;
  utilityBillPublicId?:   string;
}

export interface UpdateAgentProfileData {
  bio?: string;
  experience?: number;
  agencyName?: string;
  city?: string;
  specializations?: string[];
  languages?: string[];
  whatsapp?: string;
  website?: string;
}

export interface CreateReviewData {
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
}

// =============================================
// AUTO-GENERATE LICENSE NUMBER
// Format: GF-YYYY-NNNNN (e.g. GF-2026-00042)
// Guaranteed unique — retries on collision
// =============================================
const generateLicenseNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `GF-${year}-`;

  for (let attempt = 0; attempt < 10; attempt++) {
    // Random 5-digit number padded with zeros
    const suffix = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
    const license = `${prefix}${suffix}`;

    const exists = await Agent.findOne({ licenseNumber: license });
    if (!exists) return license;
  }

  // Fallback: use timestamp-based suffix (virtually never collides)
  return `${prefix}${Date.now().toString().slice(-5)}`;
};

// =============================================
// Build Sort
// =============================================
const buildSort = (sortBy?: string): Record<string, 1 | -1> => {
  switch (sortBy) {
    case "experience": return { experience: -1 };
    case "listings":   return { totalListings: -1 };
    case "newest":     return { createdAt: -1 };
    case "rating":
    default:           return { avgRating: -1, totalReviews: -1 };
  }
};

// =============================================
// CHECK APPLICATION STATUS
// Frontend calls this to decide what to show
// Returns null if no application exists
// =============================================
export const getApplicationStatus = async (
  userId: string,
): Promise<{ applicationStatus: string; licenseNumber?: string; rejectionReason?: string } | null> => {
  const agent = await Agent.findOne({ user: userId }).select(
    "applicationStatus licenseNumber rejectionReason",
  );
  if (!agent) return null;
  return {
    applicationStatus: agent.applicationStatus,
    licenseNumber: agent.licenseNumber,
    rejectionReason: agent.rejectionReason ?? undefined,
  };
};

// =============================================
// APPLY FOR AGENT
// - Admins blocked
// - If pending/approved → cannot re-apply
// - If rejected → can re-apply (existing record updated)
// - Auto-generates licenseNumber
// - Required docs: passportPhoto, cnicFront, cnicBack, utilityBill
// =============================================
export const createAgentProfile = async (
  userId: string,
  data: CreateAgentProfileData,
): Promise<IAgent> => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  // Block admins
  if (user.role === "admin") {
    throw new AppError(
      "Admins cannot apply for agent status.",
      403,
    );
  }

  // Required documents check
  if (!data.passportPhoto) throw new AppError("Passport size photo is required", 400);
  if (!data.cnicFront)     throw new AppError("CNIC front image is required", 400);
  if (!data.cnicBack)      throw new AppError("CNIC back image is required", 400);
  if (!data.utilityBill)   throw new AppError("Utility bill image is required", 400);

  // Check existing application
  const existing = await Agent.findOne({ user: userId });

  if (existing) {
    if (existing.applicationStatus === "pending") {
      throw new AppError(
        "Your application is already under review. Please wait for admin decision.",
        409,
      );
    }
    if (existing.applicationStatus === "approved") {
      throw new AppError(
        "You are already a verified agent.",
        409,
      );
    }

    // applicationStatus === "rejected" → allow re-apply
    // Update existing record with fresh data + new docs
    const newLicense = await generateLicenseNumber();

    // Delete old documents from Cloudinary before replacing
    const oldPublicIds = [
      existing.passportPhotoPublicId,
      existing.cnicFrontPublicId,
      existing.cnicBackPublicId,
      existing.utilityBillPublicId,
    ].filter(Boolean) as string[];

    await Promise.all(oldPublicIds.map(deleteFromCloudinary));

    const updated = await Agent.findOneAndUpdate(
      { user: userId },
      {
        applicationStatus: "pending",
        rejectionReason:   null,
        licenseNumber:     newLicense,
        bio:               data.bio,
        experience:        data.experience,
        agencyName:        data.agencyName ?? null,
        city:              data.city,
        specializations:   data.specializations ?? [],
        languages:         data.languages ?? ["English"],
        whatsapp:          data.whatsapp ?? null,
        website:           data.website ?? null,
        passportPhoto:          data.passportPhoto,
        passportPhotoPublicId:  data.passportPhotoPublicId,
        cnicFront:              data.cnicFront,
        cnicFrontPublicId:      data.cnicFrontPublicId,
        cnicBack:               data.cnicBack,
        cnicBackPublicId:       data.cnicBackPublicId,
        utilityBill:            data.utilityBill,
        utilityBillPublicId:    data.utilityBillPublicId,
      },
      { new: true, runValidators: true },
    );

    if (!updated) throw new AppError("Re-application failed", 500);
    return updated.populate("user", "name email photo phone");
  }

  // First-time application — generate license and create
  const licenseNumber = await generateLicenseNumber();

  const agent = await Agent.create({
    user:             userId,
    applicationStatus: "pending",
    licenseNumber,
    bio:              data.bio,
    experience:       data.experience,
    agencyName:       data.agencyName,
    city:             data.city,
    specializations:  data.specializations ?? [],
    languages:        data.languages ?? ["English"],
    whatsapp:         data.whatsapp,
    website:          data.website,
    passportPhoto:         data.passportPhoto,
    passportPhotoPublicId: data.passportPhotoPublicId,
    cnicFront:             data.cnicFront,
    cnicFrontPublicId:     data.cnicFrontPublicId,
    cnicBack:              data.cnicBack,
    cnicBackPublicId:      data.cnicBackPublicId,
    utilityBill:           data.utilityBill,
    utilityBillPublicId:   data.utilityBillPublicId,
    isVerified: false,
  });

  return agent.populate("user", "name email photo phone");
};

// =============================================
// GET ALL AGENTS — public directory
// Only shows approved/verified agents
// =============================================
export const getAllAgents = async (
  filters: AgentFilters,
): Promise<PaginationResult<IAgent>> => {
  const page  = Math.max(1, filters.page  ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
  const skip  = (page - 1) * limit;

  const query: Record<string, unknown> = {
    applicationStatus: "approved", // Public only sees approved agents
  };

  if (filters.city)           query.city = new RegExp(filters.city, "i");
  if (filters.language)       query.languages      = { $in: [new RegExp(filters.language, "i")] };
  if (filters.specialization) query.specializations = { $in: [new RegExp(filters.specialization, "i")] };
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
  if (filters.minRating !== undefined)  query.avgRating  = { $gte: filters.minRating };

  const sort = buildSort(filters.sortBy);

  const [data, total] = await Promise.all([
    Agent.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("user", "name email photo phone")
      .lean(),
    Agent.countDocuments(query),
  ]);

  return {
    data: data as IAgent[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// =============================================
// GET SINGLE AGENT — by agent profile id
// =============================================
export const getAgentById = async (agentId: string): Promise<IAgent> => {
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    throw new AppError("Invalid agent ID", 400);
  }

  const agent = await Agent.findById(agentId).populate(
    "user",
    "name email photo phone createdAt",
  );

  if (!agent) throw new AppError("Agent profile not found", 404);
  return agent;
};

// =============================================
// GET AGENT PROFILE BY USER ID
// =============================================
export const getAgentByUserId = async (userId: string): Promise<IAgent> => {
  const agent = await Agent.findOne({ user: userId }).populate(
    "user",
    "name email photo phone createdAt",
  );

  if (!agent) throw new AppError("This user does not have an agent profile", 404);
  return agent;
};

// =============================================
// GET MY AGENT PROFILE (own — includes docs)
// =============================================
export const getMyAgentProfile = async (userId: string): Promise<IAgent> => {
  const agent = await Agent.findOne({ user: userId })
    .populate("user", "name email photo phone")
    .select("+passportPhotoPublicId +cnicFrontPublicId +cnicBackPublicId +utilityBillPublicId");

  if (!agent) {
    throw new AppError("You don't have an agent application yet.", 404);
  }
  return agent;
};

// =============================================
// UPDATE MY AGENT PROFILE
// Only allowed when applicationStatus=approved
// =============================================
export const updateAgentProfile = async (
  userId: string,
  data: UpdateAgentProfileData,
): Promise<IAgent> => {
  const agent = await Agent.findOne({ user: userId });
  if (!agent) throw new AppError("Agent profile not found", 404);

  if (agent.applicationStatus !== "approved") {
    throw new AppError(
      "You can only update your profile after your application is approved.",
      403,
    );
  }

  const allowedFields: (keyof UpdateAgentProfileData)[] = [
    "bio", "experience", "agencyName", "city",
    "specializations", "languages", "whatsapp", "website",
  ];

  const updates: Partial<UpdateAgentProfileData> = {};
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      (updates as Record<string, unknown>)[field] = data[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError("Please provide at least one field to update", 400);
  }

  const updated = await Agent.findOneAndUpdate({ user: userId }, updates, {
    returnDocument: "after",
    runValidators: true,
  }).populate("user", "name email photo phone");

  if (!updated) throw new AppError("Agent profile not found", 404);
  return updated;
};

// =============================================
// VERIFY / REJECT AGENT — Admin only
// isVerified=true  → applicationStatus="approved", User.role="agent"
// isVerified=false → applicationStatus="rejected", User.role="buyer"
//                    rejectionReason optional
// =============================================
export const verifyAgent = async (
  agentId: string,
  isVerified: boolean,
  rejectionReason?: string,
): Promise<IAgent> => {
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    throw new AppError("Invalid agent ID", 400);
  }

  const agent = await Agent.findById(agentId).populate("user");
  if (!agent) throw new AppError("Agent profile not found", 404);

  if (isVerified) {
    agent.isVerified        = true;
    agent.applicationStatus = "approved";
    agent.rejectionReason   = undefined;
    await User.findByIdAndUpdate(agent.user, { role: "agent" });
  } else {
    agent.isVerified        = false;
    agent.applicationStatus = "rejected";
    agent.rejectionReason   = rejectionReason ?? "Application rejected by admin.";
    await User.findByIdAndUpdate(agent.user, { role: "buyer" });
  }

  await agent.save();
  return agent.populate("user", "name email photo");
};

// =============================================
// DELETE AGENT PROFILE — Agent self or Admin
// Also cleans up Cloudinary docs
// =============================================
export const deleteAgentProfile = async (
  agentId: string,
  userId: string,
  role: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    throw new AppError("Invalid agent ID", 400);
  }

  const agent = await Agent.findById(agentId).select(
    "+passportPhotoPublicId +cnicFrontPublicId +cnicBackPublicId +utilityBillPublicId",
  );
  if (!agent) throw new AppError("Agent profile not found", 404);

  if (role !== "admin" && String(agent.user) !== userId) {
    throw new AppError("You can only delete your own agent profile", 403);
  }

  const agentUserId = String(agent.user);

  // Cleanup Cloudinary docs
  const publicIds = [
    agent.passportPhotoPublicId,
    agent.cnicFrontPublicId,
    agent.cnicBackPublicId,
    agent.utilityBillPublicId,
  ].filter(Boolean) as string[];

  await Promise.all(publicIds.map(deleteFromCloudinary));

  await Agent.findByIdAndDelete(agentId);
  await User.findByIdAndUpdate(agentUserId, { role: "buyer" });
  await Property.deleteMany({ owner: agentUserId });
  await Review.deleteMany({ agent: agentUserId });
};

// =============================================
// ADD REVIEW
// =============================================
export const addReview = async (
  agentUserId: string,
  reviewerUserId: string,
  data: CreateReviewData,
): Promise<IReview> => {
  if (agentUserId === reviewerUserId) {
    throw new AppError("You cannot review yourself", 400);
  }

  const agentProfile = await Agent.findOne({ user: agentUserId });
  if (!agentProfile) throw new AppError("Agent not found", 404);
  if (!agentProfile.isVerified)
    throw new AppError("This agent is not yet verified", 400);

  const reviewer = await User.findById(reviewerUserId);
  if (!reviewer) throw new AppError("Reviewer not found", 404);

  let review: IReview;
  try {
    review = await Review.create({
      agent:    agentUserId,
      reviewer: reviewerUserId,
      rating:   data.rating,
      comment:  data.comment,
    });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) throw new AppError("You have already reviewed this agent", 409);
    throw err;
  }

  await recalcAgentRating(agentUserId);
  return review.populate("reviewer", "name photo");
};

// =============================================
// UPDATE MY REVIEW
// =============================================
export const updateMyReview = async (
  reviewId: string,
  reviewerUserId: string,
  data: CreateReviewData,
): Promise<IReview> => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new AppError("Invalid review ID", 400);
  }

  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found", 404);

  if (String(review.reviewer) !== reviewerUserId) {
    throw new AppError("You can only update your own review", 403);
  }

  review.rating  = data.rating as 1 | 2 | 3 | 4 | 5;
  review.comment = data.comment;
  await review.save();

  await recalcAgentRating(String(review.agent));
  return review.populate("reviewer", "name photo");
};

// =============================================
// DELETE REVIEW
// =============================================
export const deleteReview = async (
  reviewId: string,
  reviewerUserId: string,
  role: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new AppError("Invalid review ID", 400);
  }

  const review = await Review.findById(reviewId);
  if (!review) throw new AppError("Review not found", 404);

  if (role !== "admin" && String(review.reviewer) !== reviewerUserId) {
    throw new AppError("You can only delete your own review", 403);
  }

  const agentUserId = String(review.agent);
  await Review.findByIdAndDelete(reviewId);
  await recalcAgentRating(agentUserId);
};

// =============================================
// GET REVIEWS FOR AN AGENT
// =============================================
export const getAgentReviews = async (
  agentUserId: string,
  filters: ReviewFilters,
): Promise<PaginationResult<IReview>> => {
  const page  = Math.max(1, filters.page  ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 10));
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Review.find({ agent: agentUserId })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("reviewer", "name photo")
      .lean(),
    Review.countDocuments({ agent: agentUserId }),
  ]);

  return {
    data: data as IReview[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// =============================================
// GET AGENT LISTINGS
// =============================================
export const getAgentListings = async (
  agentUserId: string,
  page = 1,
  limit = 10,
): Promise<{ data: unknown[]; total: number; totalPages: number }> => {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Property.find({ owner: agentUserId, status: "active" })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .select("-__v")
      .lean(),
    Property.countDocuments({ owner: agentUserId, status: "active" }),
  ]);

  return { data, total, totalPages: Math.ceil(total / limit) };
};

// =============================================
// RECALC AGENT RATING — internal helper
// =============================================
const recalcAgentRating = async (agentUserId: string): Promise<void> => {
  const stats = await Review.aggregate([
    { $match: { agent: new mongoose.Types.ObjectId(agentUserId) } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, total: { $sum: 1 } } },
  ]);

  const avgRating    = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const totalReviews = stats.length > 0 ? stats[0].total : 0;

  await Agent.findOneAndUpdate({ user: agentUserId }, { avgRating, totalReviews });
};

// =============================================
// SYNC LISTINGS COUNT
// =============================================
export const syncAgentListingsCount = async (agentUserId: string): Promise<void> => {
  const count = await Property.countDocuments({ owner: agentUserId });
  await Agent.findOneAndUpdate({ user: agentUserId }, { totalListings: count });
};

// =============================================
// ADMIN: GET ALL APPLICATIONS (pending/approved/rejected)
// =============================================
export const getAllApplications = async (filters: {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  limit?: number;
}): Promise<PaginationResult<IAgent>> => {
  const page  = Math.max(1, filters.page  ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
  const skip  = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (filters.status) query.applicationStatus = filters.status;

  const [data, total] = await Promise.all([
    Agent.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email photo phone createdAt")
      .select("+passportPhotoPublicId +cnicFrontPublicId +cnicBackPublicId +utilityBillPublicId")
      .lean(),
    Agent.countDocuments(query),
  ]);

  return {
    data: data as IAgent[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENT ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
import Inquiry from "../models/inquiry.models";
import Booking from "../models/booking.models";

export const getAgentAnalytics = async (userId: string) => {
  const agent = await Agent.findOne({ user: userId, applicationStatus: "approved" });
  if (!agent) throw new AppError("Agent profile not found", 404);

  // All listings by this agent
  const listings = await Property.find({ owner: userId })
    .select("title price views status purpose type address images createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const totalListings  = listings.length;
  const activeListings = listings.filter((l) => l.status === "active").length;
  const totalViews     = listings.reduce((s, l) => s + (l.views ?? 0), 0);

  // Top 5 listings by views
  const topListings = [...listings]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);

  // Inquiries received
  const [totalInquiries, pendingInquiries, repliedInquiries] = await Promise.all([
    Inquiry.countDocuments({ agent: userId }),
    Inquiry.countDocuments({ agent: userId, status: "pending" }),
    Inquiry.countDocuments({ agent: userId, status: "replied" }),
  ]);

  // Recent 5 inquiries
  const recentInquiries = await Inquiry.find({ agent: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("sender", "name photo")
    .populate("property", "title address")
    .lean();

  // Bookings
  const [totalBookings, pendingBookings, confirmedBookings] = await Promise.all([
    Booking.countDocuments({ agent: userId }),
    Booking.countDocuments({ agent: userId, status: "pending" }),
    Booking.countDocuments({ agent: userId, status: "confirmed" }),
  ]);

  // Monthly inquiries trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyInquiries = await Inquiry.aggregate([
    {
      $match: {
        agent: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return {
    summary: {
      totalListings,
      activeListings,
      totalViews,
      totalInquiries,
      pendingInquiries,
      repliedInquiries,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      avgRating:    agent.avgRating,
      totalReviews: agent.totalReviews,
    },
    topListings,
    recentInquiries,
    monthlyInquiries,
  };
};
