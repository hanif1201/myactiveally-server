const mongoose = require("mongoose");

const GymSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      formattedAddress: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    placeId: {
      type: String, // Google Maps Place ID
      unique: true,
    },
    phone: String,
    website: String,
    email: String,
    images: [String],
    description: String,
    hours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },
    amenities: [
      {
        type: String,
        enum: [
          "free_weights",
          "cardio_equipment",
          "weight_machines",
          "pool",
          "sauna",
          "steam_room",
          "spa",
          "group_classes",
          "personal_training",
          "locker_room",
          "showers",
          "towel_service",
          "childcare",
          "wifi",
          "parking",
          "cafe",
          "pro_shop",
          "basketball_court",
          "racquetball",
          "physical_therapy",
          "massage",
          "24_hour_access",
        ],
      },
    ],
    businessHours: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
        },
        open: String, // Format: "HH:MM"
        close: String, // Format: "HH:MM"
      },
    ],
    pricing: {
      dayPass: Number,
      monthlyMembership: Number,
      annualMembership: Number,
      hasFreeTrials: Boolean,
      hasStudentDiscounts: Boolean,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    associatedInstructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Instructor",
      },
    ],
    visitCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create index for location-based queries
GymSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Gym", GymSchema);
