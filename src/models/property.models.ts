import mongoose, { Document, Schema } from "mongoose";

// =============================================
// Property Image Sub-Document
// =============================================
export interface IPropertyImage {
  url: string;
  publicId: string;
  isPrimary: boolean;
  order: number; // for ordering images
}

// =============================================
// Property Interface
// =============================================
export interface IProperty extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: "house" | "apartment" | "plot" | "commercial" | "villa";
  purpose: "sale" | "rent";
  price: number;
  area: number;
  areaUnit: "sqft" | "sqm" | "marla" | "kanal";
  bedrooms?: number;
  bathrooms?: number;
  // Extra real-world fields
  floorNumber?: number;
  totalFloors?: number;
  yearBuilt?: number;
  parkingSpaces?: number;
  features: string[];
  images: IPropertyImage[];
  address: {
    street?: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  owner: mongoose.Types.ObjectId;
  status: "active" | "sold" | "rented" | "inactive";
  isFeatured: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const propertyImageSchema = new Schema<IPropertyImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const propertySchema = new Schema<IProperty>(
  {
    title: {
      type: String,
      required: [true, "Property title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Property description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    type: {
      type: String,
      enum: ["house", "apartment", "plot", "commercial", "villa"],
      required: [true, "Property type is required"],
    },
    purpose: {
      type: String,
      enum: ["sale", "rent"],
      required: [true, "Purpose (sale/rent) is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    area: {
      type: Number,
      required: [true, "Area is required"],
      min: [1, "Area must be at least 1"],
    },
    areaUnit: {
      type: String,
      enum: ["sqft", "sqm", "marla", "kanal"],
      default: "sqft",
    },
    bedrooms: { type: Number, min: [0, "Bedrooms cannot be negative"] },
    bathrooms: { type: Number, min: [0, "Bathrooms cannot be negative"] },
    floorNumber: { type: Number, min: [0, "Floor number cannot be negative"] },
    totalFloors: { type: Number, min: [1, "Total floors must be at least 1"] },
    yearBuilt: {
      type: Number,
      min: [1800, "Year built seems too old"],
      max: [new Date().getFullYear() + 2, "Year built cannot be in far future"],
    },
    parkingSpaces: { type: Number, min: [0, "Parking spaces cannot be negative"] },
    features: { type: [String], default: [] },
    images: {
      type: [propertyImageSchema],
      default: [],
      validate: {
        // MAX 6 IMAGES
        validator: (arr: IPropertyImage[]) => arr.length <= 6,
        message: "A property can have at most 6 images",
      },
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, required: [true, "City is required"], trim: true },
      state: { type: String, required: [true, "State/Province is required"], trim: true },
      country: { type: String, required: [true, "Country is required"], trim: true },
      postalCode: { type: String, trim: true },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: [true, "Coordinates [lng, lat] are required"],
        validate: {
          validator: (v: number[]) =>
            v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 &&
            v[1] >= -90 && v[1] <= 90,
          message: "Coordinates must be [longitude, latitude] with valid range",
        },
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
    status: {
      type: String,
      enum: ["active", "sold", "rented", "inactive"],
      default: "active",
    },
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// =============================================
// Indexes
// =============================================
propertySchema.index({ location: "2dsphere" });
propertySchema.index({ status: 1, purpose: 1, type: 1 });
propertySchema.index({ "address.city": 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ isFeatured: -1, createdAt: -1 });
// Full-text search index — replaces slow $regex
propertySchema.index({ title: "text", description: "text" });

const Property = mongoose.model<IProperty>("Property", propertySchema);
export default Property;