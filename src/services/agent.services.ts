import mongoose from "mongoose";
import Agent, { IAgent } from "../models/agent.models";
import Review, { IReview } from "../models/review.models";
import Property from "../models/property.models";
import User from "../models/user.models";
import { AppError } from "../utils/errorHandler";
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
  licenseNumber: string;
  agencyName?: string;
  city: string;
  specializations?: string[];
  languages?: string[];
  whatsapp?: string;
  website?: string;
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
// Build Sort
// =============================================
const buildSort = (sortBy?: string): Record<string, 1 | -1> => {
  switch (sortBy) {
    case "experience":
      return { experience: -1 };
    case "listings":
      return { totalListings: -1 };
    case "newest":
      return { createdAt: -1 };
    case "rating":
    default:
      return { avgRating: -1, totalReviews: -1 };
  }
};

// =============================================
// APPLY FOR AGENT PROFILE
// User (role=agent) creates their profile
// Admin must verify it afterwards
// =============================================
export const createAgentProfile = async (
  userId: string,
  data: CreateAgentProfileData,
): Promise<IAgent> => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  // ✅ BLOCK ADMIN
  if (user.role === "admin") {
    throw new AppError(
      "Admins cannot create agent profiles. Only buyers can apply for agent status.",
      403
    );
  }

  // Check if already has agent profile
  const existing = await Agent.findOne({ user: userId });
  if (existing) {
    throw new AppError("You already have an agent profile", 409);
  }

  // Check license uniqueness
  const licenseExists = await Agent.findOne({
    licenseNumber: data.licenseNumber,
  });
  if (licenseExists) {
    throw new AppError("This license number is already registered", 409);
  }

  // Create agent profile (role stays "buyer" until admin approves)
  const agent = await Agent.create({
    user: userId,
    bio: data.bio,
    experience: data.experience,
    licenseNumber: data.licenseNumber,
    agencyName: data.agencyName,
    city: data.city,
    specializations: data.specializations || [],
    languages: data.languages || ["English"],
    whatsapp: data.whatsapp,
    website: data.website,
    isVerified: false,  // Pending admin approval
  });

  return agent.populate("user", "name email photo phone");
};
// =============================================
// GET ALL AGENTS — public directory
// =============================================
export const getAllAgents = async (
  filters: AgentFilters,
): Promise<PaginationResult<IAgent>> => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (filters.city) query.city = new RegExp(filters.city, "i");
  if (filters.language)
    query.languages = { $in: [new RegExp(filters.language, "i")] };
  if (filters.specialization)
    query.specializations = { $in: [new RegExp(filters.specialization, "i")] };
  if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;
  if (filters.minRating !== undefined)
    query.avgRating = { $gte: filters.minRating };

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
// Used when buyer views an agent page
// =============================================
export const getAgentByUserId = async (userId: string): Promise<IAgent> => {
  const agent = await Agent.findOne({ user: userId }).populate(
    "user",
    "name email photo phone createdAt",
  );

  if (!agent)
    throw new AppError("This user does not have an agent profile", 404);
  return agent;
};

// =============================================
// GET MY AGENT PROFILE
// Agent views their own profile
// =============================================
export const getMyAgentProfile = async (userId: string): Promise<IAgent> => {
  const agent = await Agent.findOne({ user: userId }).populate(
    "user",
    "name email photo phone",
  );

  if (!agent)
    throw new AppError(
      "You don't have an agent profile yet. Please create one.",
      404,
    );
  return agent;
};

// =============================================
// UPDATE MY AGENT PROFILE
// =============================================
export const updateAgentProfile = async (
  userId: string,
  data: UpdateAgentProfileData,
): Promise<IAgent> => {
  const agent = await Agent.findOne({ user: userId });
  if (!agent) throw new AppError("Agent profile not found", 404);

  const allowedFields: (keyof UpdateAgentProfileData)[] = [
    "bio",
    "experience",
    "agencyName",
    "city",
    "specializations",
    "languages",
    "whatsapp",
    "website",
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
// VERIFY AGENT — Admin only
// =============================================
export const verifyAgent = async (
  agentId: string,
  isVerified: boolean,
): Promise<IAgent> => {
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    throw new AppError("Invalid agent ID", 400);
  }

  const agent = await Agent.findById(agentId).populate("user");
  if (!agent) throw new AppError("Agent profile not found", 404);

  // ✅ Update agent verification status
  agent.isVerified = isVerified;
  await agent.save();

  // ✅ Update user role based on verification
  if (isVerified) {
    // Admin approved → Make user an agent
    await User.findByIdAndUpdate(agent.user, { role: "agent" });
  } else {
    // Admin rejected → Keep/revert to buyer
    await User.findByIdAndUpdate(agent.user, { role: "buyer" });
  }

  return agent.populate("user", "name email photo");
};
// =============================================
// DELETE AGENT PROFILE — Agent self or Admin
// =============================================
export const deleteAgentProfile = async (
  agentId: string,
  userId: string,
  role: string,
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    throw new AppError("Invalid agent ID", 400);
  }

  const agent = await Agent.findById(agentId);
  if (!agent) throw new AppError("Agent profile not found", 404);

  // ✅ Authorization check
  if (role !== "admin" && String(agent.user) !== userId) {
    throw new AppError("You can only delete your own agent profile", 403);
  }

  const agentUserId = String(agent.user);

  // ✅ Delete agent profile
  await Agent.findByIdAndDelete(agentId);

  // ✅ REVERT USER ROLE TO BUYER
  await User.findByIdAndUpdate(agentUserId, { 
    role: "buyer" 
  });

  // Delete all their properties as well
   await Property.deleteMany({ owner: agentUserId });

  //  Delete all reviews for this agent
   await Review.deleteMany({ agent: agentUserId });
};
// =============================================
// ADD REVIEW
// Buyer reviews an agent
// One review per buyer per agent
// =============================================
export const addReview = async (
  agentUserId: string, // the agent's user._id
  reviewerUserId: string, // the buyer's user._id
  data: CreateReviewData,
): Promise<IReview> => {
  // Cannot review yourself
  if (agentUserId === reviewerUserId) {
    throw new AppError("You cannot review yourself", 400);
  }

  // Agent must exist and be verified
  const agentProfile = await Agent.findOne({ user: agentUserId });
  if (!agentProfile) throw new AppError("Agent not found", 404);
  if (!agentProfile.isVerified)
    throw new AppError("This agent is not yet verified", 400);

  // Check reviewer is a buyer
  const reviewer = await User.findById(reviewerUserId);
  if (!reviewer) throw new AppError("Reviewer not found", 404);

  // Create review (compound unique index prevents duplicates automatically)
  let review: IReview;
  try {
    review = await Review.create({
      agent: agentUserId,
      reviewer: reviewerUserId,
      rating: data.rating,
      comment: data.comment,
    });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      throw new AppError("You have already reviewed this agent", 409);
    }
    throw err;
  }

  // Recalculate avg rating and update Agent document
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

  review.rating = data.rating as 1 | 2 | 3 | 4 | 5;
  review.comment = data.comment;
  await review.save();

  // Recalculate
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

  // Recalculate
  await recalcAgentRating(agentUserId);
};

// =============================================
// GET REVIEWS FOR AN AGENT
// =============================================
export const getAgentReviews = async (
  agentUserId: string,
  filters: ReviewFilters,
): Promise<PaginationResult<IReview>> => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;

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
// GET AGENT LISTINGS (their properties)
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
// Called after add/update/delete review
// =============================================
const recalcAgentRating = async (agentUserId: string): Promise<void> => {
  const stats = await Review.aggregate([
    { $match: { agent: new mongoose.Types.ObjectId(agentUserId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        total: { $sum: 1 },
      },
    },
  ]);

  const avgRating =
    stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const totalReviews = stats.length > 0 ? stats[0].total : 0;

  await Agent.findOneAndUpdate(
    { user: agentUserId },
    { avgRating, totalReviews },
  );
};

// =============================================
// SYNC LISTINGS COUNT — called after property CRUD
// Can be called from property service on create/delete
// =============================================
export const syncAgentListingsCount = async (
  agentUserId: string,
): Promise<void> => {
  const count = await Property.countDocuments({ owner: agentUserId });
  await Agent.findOneAndUpdate({ user: agentUserId }, { totalListings: count });
};
