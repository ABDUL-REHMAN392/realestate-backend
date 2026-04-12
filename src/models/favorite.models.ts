import mongoose, { Document, Schema } from "mongoose";

export interface IFavorite extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  property: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property reference is required"],
    },
  },
  { timestamps: true },
);

favoriteSchema.index({ user: 1, property: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });
favoriteSchema.index({ property: 1 });

const Favorite = mongoose.model<IFavorite>("Favorite", favoriteSchema);
export default Favorite;
