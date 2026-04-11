import mongoose, { Document, Schema } from "mongoose";

// =============================================
// Review Interface
// Buyer leaves review for an agent
// One buyer can leave ONE review per agent
// =============================================
export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId; // ref: User (the agent)
  reviewer: mongoose.Types.ObjectId; // ref: User (the buyer)
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    agent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Agent reference is required"],
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer reference is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
  },
  { timestamps: true },
);

// =============================================
// Indexes
// One buyer — one review per agent (compound unique)
// =============================================
reviewSchema.index({ agent: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ agent: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1 });

const Review = mongoose.model<IReview>("Review", reviewSchema);
export default Review;
