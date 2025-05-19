const mongoose = require("mongoose");

const InstructorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    specializations: [
      {
        type: String,
        enum: [
          "personal_training",
          "yoga",
          "pilates",
          "nutrition",
          "weight_lifting",
          "cardio",
          "crossfit",
          "rehabilitation",
          "prenatal",
          "senior_fitness",
          "youth_fitness",
          "sports_specific",
        ],
      },
    ],
    certifications: [
      {
        name: {
          type: String,
          required: true,
        },
        issuingOrganization: String,
        dateObtained: Date,
        expiryDate: Date,
        verificationUrl: String,
        isVerified: {
          type: Boolean,
          default: false,
        },
      },
    ],
    experience: {
      type: Number, // Years of experience
      min: 0,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: 50,
    },
    availability: [
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
        slots: [
          {
            startTime: String, // Format: "HH:MM"
            endTime: String, // Format: "HH:MM"
            isBooked: {
              type: Boolean,
              default: false,
            },
          },
        ],
      },
    ],
    biography: {
      type: String,
      maxlength: 1000,
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
    isVerified: {
      type: Boolean,
      default: false,
    },
    paymentDetails: {
      accountId: String, // Stripe account ID
      hasCompletedOnboarding: {
        type: Boolean,
        default: false,
      },
    },
    activeConsultations: {
      type: Number,
      default: 0,
    },
    completedConsultations: {
      type: Number,
      default: 0,
    },
    cancelledConsultations: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Instructor", InstructorSchema);
